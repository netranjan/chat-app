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

  return `
    <div class="${classList}" data-id="${msg.id}">
      <div class="message-sender">${senderName}</div>
      <div class="message-bubble">
        ${replyHTML}
        <div class="message-text">${msg.text}</div>
        <div class="message-footer">
          <span class="message-time">${formatTime(msg.timestamp)}${editedBadge}</span>
          ${readReceipt ? `<span class="read-receipt" style="font-size:11px;color:#666;margin-left:4px;">${readReceipt}</span>` : ''}
          <span class="message-like">
            <button class="like-btn ${isLiked ? 'liked' : ''}">❤️</button>
            <span class="like-count">${likeCount}</span>
          </span>
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

// ---------- Main reconciliation – update DOM to match active messages ----------
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

  // Remove any DOM elements whose message was deleted
  for (const [id, el] of messageElements) {
    if (!activeIds.includes(id)) {
      el.remove();
      messageElements.delete(id);
    }
  }

  // Insert / update messages in the correct order
  let previousEl = null;
  for (const id of activeIds) {
    let el = messageElements.get(id);
    if (!el) {
      // Create new element
      const msg = messagesMap.get(id);
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildMessageHTML(msg);
      el = tempDiv.firstElementChild;
      bindMessageEvents(el, id);
      messageElements.set(id, el);
    } else {
      // Update existing element
      updateMessageElement(el, messagesMap.get(id));
    }

    // Place element at correct DOM position
    if (previousEl) {
      if (previousEl.nextSibling !== el) {
        container.insertBefore(el, previousEl.nextSibling);
      }
    } else {
      // First message
      if (container.firstChild !== el) {
        container.insertBefore(el, container.firstChild);
      }
    }
    previousEl = el;
  }

  // ---- Scroll behaviour (like WhatsApp) ----
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

// ---------- Optimistic send ----------
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
  syncMessages(true);   // scroll to bottom

  try {
    const res = await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, replyTo })
    });
    if (!res.ok) throw new Error('Send failed');
    const data = await res.json();
    messagesMap.delete(tempId);
    messagesMap.set(data.message.id, data.message);
    syncMessages(true);
  } catch {
    messagesMap.delete(tempId);
    syncMessages(true);
    alert('Failed to send message.');
  }
}

// ---------- Optimistic like ----------
async function toggleLike(id) {
  const msg = messagesMap.get(id);
  if (!msg) return;
  const originalLikes = [...(msg.likes || [])];
  const idx = originalLikes.indexOf(currentUser.id);
  if (idx === -1) msg.likes.push(currentUser.id);
  else msg.likes.splice(idx, 1);
  msg.likesUpdatedAt = new Date().toISOString();
  syncMessages();   // instant UI update

  try {
    const res = await fetch(`/messages/${id}/like`, { method: 'POST' });
    if (!res.ok) throw new Error('Like failed');
  } catch {
    msg.likes = originalLikes;
    msg.likesUpdatedAt = null;
    syncMessages();
    alert('Failed to like.');
  }
}

// ---------- Optimistic delete ----------
async function deleteMessage(id) {
  if (!confirm('Delete this message?')) return;
  const msg = messagesMap.get(id);
  if (!msg) return;
  const wasDeleted = msg.deleted;
  msg.deleted = true;
  msg.edited = true;
  msg.editedAt = new Date().toISOString();
  syncMessages();   // will remove from display

  try {
    const res = await fetch(`/messages/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
  } catch {
    msg.deleted = wasDeleted;
    msg.edited = false;
    msg.editedAt = null;
    syncMessages();
    alert('Failed to delete.');
  }
}

// ---------- Optimistic edit ----------
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
    if (!res.ok) throw new Error('Edit failed');
  } catch {
    msg.text = originalText;
    msg.edited = originalEdited;
    msg.editedAt = null;
    syncMessages();
    alert('Failed to edit.');
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

  // Cancel any previous edit mode
  if (editingMessageId !== null) editingMessageId = null;

  const el = messageElements.get(id);
  if (!el) return;
  const textDiv = el.querySelector('.message-text');
  if (!textDiv) return;

  editingMessageId = id;   // protect this message from polling text updates

  textDiv.innerHTML = `
    <div class="edit-container">
      <textarea id="editInput">${msg.text}</textarea>
      <div class="edit-actions">
        <button class="save-edit" id="saveEdit">Save</button>
        <button class="cancel-edit" id="cancelEdit">Cancel</button>
      </div>
    </div>`;

  // Stop clicks inside edit box from toggling action buttons
  document.getElementById('editInput').addEventListener('click', e => e.stopPropagation());
  document.querySelector('.edit-container').addEventListener('click', e => e.stopPropagation());

  document.getElementById('saveEdit').onclick = async () => {
    const newText = document.getElementById('editInput').value.trim();
    editingMessageId = null;
    if (newText) await editMessage(id, newText);
    else syncMessages();   // revert to normal view
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

    // Incorporate new messages
    newMessages.forEach(m => {
      const existing = messagesMap.get(m.id);
      if (!existing ||
          new Date(m.editedAt || 0) > new Date(existing.editedAt || 0) ||
          new Date(m.likesUpdatedAt || 0) > new Date(existing.likesUpdatedAt || 0)) {
        if (!existing) {
          trulyNewCount++;
          // Notification only for messages from the other user
          if (m.senderId !== currentUser.id) {
            messagesForNotification.push(m);
          }
        }
        messagesMap.set(m.id, m);
      }
    });
    // Incorporate edited messages (likes, etc.)
    editedMessages.forEach(m => {
      const existing = messagesMap.get(m.id);
      if (!existing ||
          new Date(m.editedAt || 0) > new Date(existing.editedAt || 0) ||
          new Date(m.likesUpdatedAt || 0) > new Date(existing.likesUpdatedAt || 0)) {
        messagesMap.set(m.id, m);
      }
    });

    // Show browser notification only when the tab is hidden
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

    // Update unread count if user isn't at the bottom
    if (trulyNewCount > 0 && !wasAtBottom) {
      unreadCount += trulyNewCount;
    }

    // Reconcile the DOM (without auto‑scroll yet)
    syncMessages(false);

    // Auto‑scroll if user was at the bottom
    if (wasAtBottom) {
      const container = document.getElementById('messagesContainer');
      if (container) container.scrollTop = container.scrollHeight;
      unreadCount = 0;
      updateNewMessagesButton();
    }

    // Typing indicator (rasuv only)
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
    syncMessages(true);   // scroll to bottom initially
    const sorted = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lastSync = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : new Date().toISOString();
  } catch (err) {
    console.error('Initial load error:', err);
    lastSync = new Date().toISOString();
  }
}

// ---------- Clear chat (rasuv only) ----------
document.getElementById('clearChatBtn')?.addEventListener('click', async () => {
  if (!confirm('Delete all messages for both users?')) return;
  const res = await fetch('/messages/all', { method: 'DELETE' });
  if (res.ok) {
    messagesMap.clear();
    syncMessages(true);
  } else {
    alert('Failed to clear chat.');
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

// ---------- Manual refresh button ----------
async function refreshChat() {
  const btn = document.getElementById('refreshChatBtn');
  if (btn) {
    btn.textContent = '⏳ Refreshing…';
    btn.disabled = true;
  }

  // Reset all state
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
    if (!res.ok) throw new Error('Refresh failed');
    const messages = await res.json();
    messages.forEach(m => messagesMap.set(m.id, m));
    syncMessages(true);
    const sorted = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lastSync = sorted.length > 0 ? sorted[sorted.length - 1].timestamp : new Date().toISOString();
  } catch (err) {
    console.error('Refresh error:', err);
    alert('Failed to refresh chat. Please try again.');
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

// Emoji button placeholder
document.getElementById('emojiBtn')?.addEventListener('click', () => {
  alert('Emoji picker coming soon!');
});

// ---------- Start everything ----------
loadInitial().finally(() => {
  setInterval(poll, 500);
});