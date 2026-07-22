// ==========================
//  Campusfify Chat – Client
// ==========================

const currentUser = window.USER;       // logged-in user object
const messagesMap = new Map();          // id → full message object
const messageElements = new Map();      // id → DOM element
let lastSync = null;                    // last poll timestamp (ISO)
let replyToId = null;                   // ID of message we're replying to
let tempMsgCounter = -1;                // for generating temporary IDs
let editingMessageId = null;            // ID of message currently in edit mode

// ---------- Scroll state ----------
let isNearBottom = true;                // user is following latest messages
let unreadCount = 0;                    // new messages arrived while scrolling up

// ---------- Notification permission (asked once on first click) ----------
document.body.addEventListener('click', function requestNotifPerm() {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  document.body.removeEventListener('click', requestNotifPerm);
}, { once: true });

// ---------- Time formatting (12h + yesterday/date) ----------
function formatTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday at ${timeStr}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ` at ${timeStr}`;
}

// ---------- Date label helper (for separators) ----------
function getDateLabel(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

// ---------- Build HTML for one message element ----------
function buildMessageHTML(msg) {
  const isMine = msg.senderId === currentUser.id;
  const senderName = msg.senderId === 1 ? 'rasuv' : 'manu';
  const classList = [
    'message',
    isMine ? 'own' : 'other',
    msg.senderId === 2 ? 'manu-message' : '',
    msg.senderId === 1 ? 'rasuv-message' : ''
  ].join(' ').trim();

  // Reply preview
  let replyHTML = '';
  if (msg.replyTo && messagesMap.has(msg.replyTo)) {
    const parent = messagesMap.get(msg.replyTo);
    const previewText = parent.deleted ? '[Message deleted]' : parent.text;
    replyHTML = `<div class="reply-preview"><span class="reply-label">↩ ${parent.senderId === 1 ? 'rasuv' : 'manu'}</span> ${previewText}</div>`;
  }

  const likeCount = msg.likes ? msg.likes.length : 0;
  const isLiked = msg.likes && msg.likes.includes(currentUser.id);
  const editedBadge = msg.edited ? '<span class="edited-badge">(edited)</span>' : '';
  const readReceipt = (currentUser.id === 1 && msg.senderId === 1)
    ? (msg.readBy && msg.readBy.length > 0 ? '✓✓' : '✓')
    : '';

  // Heart & count only visible when likes > 0
  const likeSection = likeCount > 0
    ? `<span class="message-like">
         <button class="like-btn ${isLiked ? 'liked' : ''}">❤️</button>
         <span class="like-count">${likeCount}</span>
       </span>`
    : '';

  return `
    <div class="${classList}" data-id="${msg.id}">
      <div class="message-sender">${senderName}</div>
      <div class="message-bubble">
        ${replyHTML}
        <div class="message-text">${msg.text}</div>
        <div class="message-footer">
          <span class="message-time">${formatTime(msg.timestamp)}${editedBadge}</span>
          ${readReceipt ? `<span class="read-receipt" style="font-size:11px;color:#666;margin-left:4px;">${readReceipt}</span>` : ''}
          ${likeSection}
        </div>
      </div>
      <div class="message-actions">
        <button class="like-btn-action">❤️</button>
        <button class="reply-btn">↩ Reply</button>
        <button class="edit-btn">✏️ Edit</button>
        <button class="delete-btn">🗑 Delete</button>
      </div>
    </div>`;
}

// ---------- Update an existing message element (incremental) ----------
function updateMessageElement(el, msg) {
  const isEditing = msg.id === editingMessageId;

  // Text – skip if currently editing this message
  if (!isEditing) {
    const textDiv = el.querySelector('.message-text');
    if (textDiv && textDiv.textContent !== msg.text) {
      textDiv.textContent = msg.text;
    }
  }

  // Time & edited badge
  const timeSpan = el.querySelector('.message-time');
  if (timeSpan) {
    const newTimeHTML = formatTime(msg.timestamp) + (msg.edited ? '<span class="edited-badge">(edited)</span>' : '');
    if (timeSpan.innerHTML !== newTimeHTML) timeSpan.innerHTML = newTimeHTML;
  }

  // Read receipt (rasuv only)
  if (currentUser.id === 1 && msg.senderId === 1) {
    let readEl = el.querySelector('.read-receipt');
    const readText = msg.readBy && msg.readBy.length > 0 ? '✓✓' : '✓';
    if (readEl) {
      if (readEl.textContent !== readText) readEl.textContent = readText;
    } else {
      const footer = el.querySelector('.message-footer');
      if (footer) {
        const span = document.createElement('span');
        span.className = 'read-receipt';
        span.style.cssText = 'font-size:11px;color:#666;margin-left:4px;';
        span.textContent = readText;
        footer.appendChild(span);
      }
    }
  }

  // Like button & counter
  const likeBtn = el.querySelector('.message-like .like-btn');
  const likeCountSpan = el.querySelector('.like-count');
  if (likeBtn && likeCountSpan) {
    const isLiked = msg.likes && msg.likes.includes(currentUser.id);
    likeBtn.classList.toggle('liked', isLiked);
    const newCount = msg.likes ? msg.likes.length : 0;
    if (likeCountSpan.textContent !== String(newCount)) {
      likeCountSpan.textContent = newCount;
    }
  }
}

// ---------- Attach event listeners to a newly created message element ----------
function bindMessageEvents(el, id) {
  // Toggle action buttons on click (except when clicking buttons/textarea)
  el.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
    el.classList.toggle('show-actions');
  });

  // Double‑click (double‑tap) to like the message
  el.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(id);
  });

  // Inline like button
  el.querySelector('.message-like .like-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleLike(id);
  });
  // Action like button
  el.querySelector('.like-btn-action')?.addEventListener('click', e => {
    e.stopPropagation();
    toggleLike(id);
  });
  // Reply
  el.querySelector('.reply-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    setReply(id);
  });
  // Edit
  el.querySelector('.edit-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    enterEditMode(id);
  });
  // Delete
  el.querySelector('.delete-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    deleteMessage(id);
  });

  // Read receipts (manu observing rasuv's messages)
  if (currentUser.username === 'manu') {
    const msg = messagesMap.get(id);
    if (msg && msg.senderId === 1 && !(msg.readBy || []).includes(2)) {
      const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          fetch(`/messages/${id}/read`, { method: 'POST' });
          observer.disconnect();
        }
      }, { threshold: 1.0 });
      observer.observe(el);
    }
  }
}

// ---------- Main reconciliation – update DOM to match active messages (with date separators) ----------
function syncMessages(forceScroll = false) {
  const container = document.getElementById('messagesContainer');
  if (!container) return;

  // Get sorted list of non‑deleted message IDs
  const activeIds = Array.from(messagesMap.values())
    .filter(m => !m.deleted)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(m => m.id);

  // Empty state
  if (activeIds.length === 0) {
    if (container.children.length !== 1 || !container.querySelector('.empty-state')) {
      container.innerHTML = `<div class="empty-state"><span class="emoji">💬</span><p>No messages yet.</p><p class="sub-text">Be the first to say hello!</p></div>`;
      messageElements.clear();
    }
    return;
  }

  // Remove empty‑state placeholder if present
  const emptyEl = container.querySelector('.empty-state');
  if (emptyEl) emptyEl.remove();

  // Remove all existing date separators (we'll recreate them)
  container.querySelectorAll('.date-separator').forEach(el => el.remove());

  // Remove any DOM elements whose message was deleted
  for (const [id, el] of messageElements) {
    if (!activeIds.includes(id)) {
      el.remove();
      messageElements.delete(id);
    }
  }

  let lastDateLabel = null;
  let previousEl = null;

  for (const id of activeIds) {
    const msg = messagesMap.get(id);
    if (!msg) continue;

    // ---- Date separator ----
    const currentLabel = getDateLabel(msg.timestamp);
    if (currentLabel !== lastDateLabel) {
      const sep = document.createElement('div');
      sep.className = 'date-separator';
      sep.innerHTML = `<span>${currentLabel}</span>`;

      if (previousEl) {
        previousEl.insertAdjacentElement('afterend', sep);
      } else {
        container.insertBefore(sep, container.firstChild);
      }
      previousEl = sep;
      lastDateLabel = currentLabel;
    }

    // ---- Message element ----
    let el = messageElements.get(id);

    // If the like state changed (0 ⇄ >0), rebuild the whole element
    if (el) {
      const hasHeart = !!el.querySelector('.message-like');
      const shouldHaveHeart = msg.likes && msg.likes.length > 0;
      if (hasHeart !== shouldHaveHeart) {
        el.remove();
        messageElements.delete(id);
        el = null;
      }
    }

    if (!el) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildMessageHTML(msg);
      el = tempDiv.firstElementChild;
      bindMessageEvents(el, id);
      messageElements.set(id, el);
    } else {
      updateMessageElement(el, msg);
    }

    // Place message element at correct DOM position
    if (previousEl) {
      if (previousEl.nextSibling !== el) {
        container.insertBefore(el, previousEl.nextSibling);
      }
    } else {
      if (container.firstChild !== el) {
        container.insertBefore(el, container.firstChild);
      }
    }
    previousEl = el;
  }

  // ---- Scroll behaviour ----
  const threshold = 50;
  isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

  if (forceScroll || isNearBottom) {
    container.scrollTop = container.scrollHeight;
    unreadCount = 0;
    updateNewMessagesButton();
  } else {
    updateNewMessagesButton();
  }
}

// ---------- Floating "new messages" button ----------
function updateNewMessagesButton() {
  const btn = document.getElementById('newMessagesBtn');
  const countSpan = document.getElementById('newMsgCount');
  if (!btn || !countSpan) return;

  if (unreadCount > 0 && !isNearBottom) {
    btn.style.display = 'flex';
    countSpan.textContent = unreadCount;
  } else {
    btn.style.display = 'none';
    unreadCount = 0;
  }
}

// ---------- Optimistic send (with detailed error) ----------
async function sendMessage(text, replyTo) {
  const tempId = tempMsgCounter--;
  const tempMsg = {
    id: tempId,
    senderId: currentUser.id,
    text,
    timestamp: new Date().toISOString(),
    edited: false,
    deleted: false,
    replyTo,
    likes: [],
    readBy: []
  };
  messagesMap.set(tempId, tempMsg);
  syncMessages(true);

  try {
    const res = await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, replyTo })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Could not send message');
    }
    messagesMap.delete(tempId);
    messagesMap.set(data.message.id, data.message);
    syncMessages(true);
  } catch (err) {
    messagesMap.delete(tempId);
    syncMessages(true);
    alert(`Failed to send message:\n${err.message}`);
  }
}

// ---------- Optimistic like (with detailed error) ----------
async function toggleLike(id) {
  const msg = messagesMap.get(id);
  if (!msg) return;
  const originalLikes = [...(msg.likes || [])];
  const idx = originalLikes.indexOf(currentUser.id);
  if (idx === -1) msg.likes.push(currentUser.id);
  else msg.likes.splice(idx, 1);
  msg.likesUpdatedAt = new Date().toISOString();
  syncMessages();

  try {
    const res = await fetch(`/messages/${id}/like`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Like failed');
  } catch (err) {
    msg.likes = originalLikes;
    msg.likesUpdatedAt = null;
    syncMessages();
    alert(`Failed to like:\n${err.message}`);
  }
}

// ---------- Optimistic delete (with detailed error) ----------
async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  const msg = messagesMap.get(id);
  if (!msg) return;
  const wasDeleted = msg.deleted;
  msg.deleted = true;
  msg.edited = true;
  msg.editedAt = new Date().toISOString();
  syncMessages();

  try {
    const res = await fetch(`/messages/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed');
  } catch (err) {
    msg.deleted = wasDeleted;
    msg.edited = false;
    msg.editedAt = null;
    syncMessages();
    alert(`Failed to delete:\n${err.message}`);
  }
}

// ---------- Optimistic edit (with detailed error) ----------
async function editMessage(id, newText) {
  const msg = messagesMap.get(id);
  if (!msg) return;
  const originalText = msg.text;
  const originalEdited = msg.edited;
  msg.text = newText;
  msg.edited = true;
  msg.editedAt = new Date().toISOString();
  syncMessages();

  try {
    const res = await fetch(`/messages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Edit failed');
  } catch (err) {
    msg.text = originalText;
    msg.edited = originalEdited;
    msg.editedAt = null;
    syncMessages();
    alert(`Failed to edit:\n${err.message}`);
  }
}

// ---------- Reply ----------
function setReply(id) {
  replyToId = id;
  const parent = messagesMap.get(id);
  if (parent) {
    document.getElementById('replyPreview').style.display = 'flex';
    document.getElementById('replyText').textContent =
      `Replying to ${parent.senderId === 1 ? 'rasuv' : 'manu'}: ${parent.deleted ? '[deleted]' : parent.text}`;
  }
}
function cancelReply() {
  replyToId = null;
  document.getElementById('replyPreview').style.display = 'none';
}

// ---------- Inline editing mode ----------
function enterEditMode(id) {
  const msg = messagesMap.get(id);
  if (!msg || msg.senderId !== currentUser.id || msg.deleted) return;

  if (editingMessageId !== null) editingMessageId = null;

  const el = messageElements.get(id);
  if (!el) return;
  const textDiv = el.querySelector('.message-text');
  if (!textDiv) return;

  editingMessageId = id;

  textDiv.innerHTML = `
    <div class="edit-container">
      <textarea id="editInput">${msg.text}</textarea>
      <div class="edit-actions">
        <button class="save-edit" id="saveEdit">Save</button>
        <button class="cancel-edit" id="cancelEdit">Cancel</button>
      </div>
    </div>`;

  document.getElementById('editInput').addEventListener('click', e => e.stopPropagation());
  document.querySelector('.edit-container').addEventListener('click', e => e.stopPropagation());

  document.getElementById('saveEdit').onclick = async () => {
    const newText = document.getElementById('editInput').value.trim();
    editingMessageId = null;
    if (newText) await editMessage(id, newText);
    else syncMessages();
  };

  document.getElementById('cancelEdit').onclick = () => {
    editingMessageId = null;
    syncMessages();
  };
}

// ---------- Polling (every 500ms) + notifications ----------
async function poll() {
  try {
    const url = `/sse/poll?lastSync=${encodeURIComponent(lastSync || '')}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    lastSync = data.timestamp;
    const newMessages = data.newMessages || [];
    const editedMessages = data.editedMessages || [];

    const wasAtBottom = isNearBottom;
    let trulyNewCount = 0;
    const messagesForNotification = [];

    newMessages.forEach(m => {
      const existing = messagesMap.get(m.id);
      if (!existing ||
          new Date(m.editedAt || 0) > new Date(existing.editedAt || 0) ||
          new Date(m.likesUpdatedAt || 0) > new Date(existing.likesUpdatedAt || 0)) {
        if (!existing) {
          trulyNewCount++;
          if (m.senderId !== currentUser.id) {
            messagesForNotification.push(m);
          }
        }
        messagesMap.set(m.id, m);
      }
    });
    editedMessages.forEach(m => {
      const existing = messagesMap.get(m.id);
      if (!existing ||
          new Date(m.editedAt || 0) > new Date(existing.editedAt || 0) ||
          new Date(m.likesUpdatedAt || 0) > new Date(existing.likesUpdatedAt || 0)) {
        messagesMap.set(m.id, m);
      }
    });

    if (messagesForNotification.length > 0 &&
        document.visibilityState === 'hidden' &&
        Notification.permission === 'granted') {
      const sender = messagesForNotification[0].senderId === 1 ? 'rasuv' : 'manu';
      const body = messagesForNotification.length === 1
        ? messagesForNotification[0].text.substring(0, 100)
        : `${messagesForNotification.length} new messages`;
      const notif = new Notification(`New message${messagesForNotification.length > 1 ? 's' : ''} from ${sender}`, {
        body,
        icon: '/favicon.ico'
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }

    if (trulyNewCount > 0 && !wasAtBottom) {
      unreadCount += trulyNewCount;
    }

    syncMessages(false);

    if (wasAtBottom) {
      const container = document.getElementById('messagesContainer');
      if (container) container.scrollTop = container.scrollHeight;
      unreadCount = 0;
      updateNewMessagesButton();
    }

    if (currentUser.id === 1 && data.manuStatus) {
      const typingDiv = document.getElementById('typingIndicator');
      const typingText = document.getElementById('typingText');
      if (typingDiv) {
        if (data.manuStatus.isTyping) {
          const since = new Date(data.manuStatus.typingUpdatedAt);
          const timeStr = since.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
          typingDiv.style.display = 'flex';
          if (typingText) typingText.textContent = `manu is typing… (since ${timeStr})`;
        } else {
          typingDiv.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // Silently ignore polling errors
  }
}

// ---------- Online / offline status ----------
function setOnline(online) {
  fetch('/status/online', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: online })
  }).catch(() => {});
}
window.addEventListener('load', () => setOnline(true));
window.addEventListener('beforeunload', () => setOnline(false));
document.addEventListener('visibilitychange', () => {
  setOnline(!document.hidden);
});

// ---------- Typing indicator (only for manu) ----------
let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
  if (currentUser.username === 'manu') {
    fetch('/status/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: true, typingTo: 1 })
    });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      fetch('/status/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false, typingTo: 1 })
      });
    }, 2000);
  }
});

// ---------- IP‑based location (only for manu) ----------
async function sendLocation() {
  if (currentUser.username !== 'manu') return;
  try {
    const resp = await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,query');
    const data = await resp.json();
    if (data.status === 'success') {
      await fetch('/status/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: data.lat,
          lng: data.lon,
          address: `${data.city}, ${data.regionName}, ${data.country}`,
          city: data.city,
          state: data.regionName,
          country: data.country,
          district: data.district || '',
          isp: data.isp,
          ip: data.query
        })
      });
    }
  } catch (e) {
    console.error('Location fetch failed:', e);
  }
}
if (currentUser.username === 'manu') {
  sendLocation();
  setInterval(sendLocation, 60000);
}

// ---------- Initial load ----------
async function loadInitial() {
  try {
    const res = await fetch('/api/messages');
    if (!res.ok) throw new Error('Could not load messages');
    const messages = await res.json();
    messages.forEach(m => messagesMap.set(m.id, m));
    syncMessages(true);
    const sorted = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lastSync = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : new Date().toISOString();
  } catch (err) {
    console.error('Initial load error:', err);
    lastSync = new Date().toISOString();
  }
}

// ---------- Clear chat (rasuv only, with error) ----------
document.getElementById('clearChatBtn')?.addEventListener('click', async () => {
  if (!confirm('Delete all messages for both users?')) return;
  try {
    const res = await fetch('/messages/all', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Clear failed');
    messagesMap.clear();
    syncMessages(true);
  } catch (err) {
    alert(`Failed to clear chat:\n${err.message}`);
  }
});

// ---------- "New messages" floating button ----------
document.getElementById('newMessagesBtn')?.addEventListener('click', () => {
  const container = document.getElementById('messagesContainer');
  if (container) {
    container.scrollTop = container.scrollHeight;
    unreadCount = 0;
    updateNewMessagesButton();
  }
});

// ---------- Manual refresh button (with error) ----------
async function refreshChat() {
  const btn = document.getElementById('refreshChatBtn');
  if (btn) {
    btn.textContent = '⏳ Refreshing…';
    btn.disabled = true;
  }

  messagesMap.clear();
  messageElements.clear();
  lastSync = null;
  unreadCount = 0;
  editingMessageId = null;
  updateNewMessagesButton();

  const container = document.getElementById('messagesContainer');
  if (container) container.innerHTML = '';

  try {
    const res = await fetch('/api/messages');
    if (!res.ok) throw new Error('Server error while refreshing');
    const messages = await res.json();
    messages.forEach(m => messagesMap.set(m.id, m));
    syncMessages(true);
    const sorted = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lastSync = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : new Date().toISOString();
  } catch (err) {
    console.error(err);
    alert(`Failed to refresh chat:\n${err.message}`);
  } finally {
    if (btn) {
      btn.innerHTML = '<span>🔄</span> Refresh';
      btn.disabled = false;
    }
  }
}
document.getElementById('refreshChatBtn')?.addEventListener('click', refreshChat);

// ---------- Send message form ----------
document.getElementById('messageForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;
  sendMessage(text, replyToId);
  input.value = '';
  cancelReply();
});

document.getElementById('cancelReply')?.addEventListener('click', cancelReply);
document.getElementById('emojiBtn')?.addEventListener('click', () => {
  alert('Emoji picker coming soon!');
});

// ---------- Start everything ----------
loadInitial().finally(() => {
  setInterval(poll, 500);
});