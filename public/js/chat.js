// ==========================
//  Campusfify Chat – Client
// ==========================

const currentUser = window.USER;
const messagesMap = new Map();
const messageElements = new Map();
let lastSync = null;
let replyToId = null;
let tempMsgCounter = -1;
let editingMessageId = null;

// Scroll state
let shouldAutoScroll = true;
let unreadCount = 0;
let sentinel = null;
let sentinelObserver = null;

// ---------- Notification permission ----------
document.body.addEventListener('click', function requestNotifPerm() {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  document.body.removeEventListener('click', requestNotifPerm);
}, { once: true });

// ---------- Time formatting ----------
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

// ---------- Build HTML ----------
function buildMessageHTML(msg) {
  const isMine = msg.senderId === currentUser.id;
  const senderName = msg.senderId === 1 ? 'rasuv' : 'manu';

  const baseClasses = [
    'message',
    'max-w-[80%]',
    'sm:max-w-[75%]',
    'flex',
    'flex-col',
    'mb-0',
    'cursor-pointer',
    'origin-left',
    isMine ? 'self-end items-end origin-right' : 'self-start items-start',
  ].join(' ');

  let bubbleClasses = msg.senderId === 2
    ? 'bg-gradient-to-br from-pink-50 to-pink-200 text-[#1a1a2e] rounded-2xl rounded-br-md'
    : 'bg-gradient-to-br from-blue-50 to-blue-200 text-[#1a1a2e] rounded-2xl rounded-bl-md';

  if (msg.deleted) {
    bubbleClasses = 'bg-gray-100 text-gray-400 italic shadow-none rounded-2xl';
  }

  let replyHTML = '';
  if (msg.replyTo) {
    const parent = messagesMap.get(msg.replyTo);
    const replySender = parent ? (parent.senderId === 1 ? 'rasuv' : 'manu') : 'unknown';
    const previewText = parent
      ? (parent.deleted ? '[Message deleted]' : parent.text)
      : '[original message not loaded]';
    replyHTML = `
      <div class="text-sm py-1.5 px-3 bg-black/5 rounded-xl mb-1.5 border-l-2 border-pink-500 text-gray-500">
        <span class="text-xs font-semibold text-pink-500 block mb-0.5">↩ ${replySender}</span>
        ${previewText}
      </div>`;
  }

  const likeCount = msg.likes ? msg.likes.length : 0;
  const editedBadge = msg.edited ? '<span class="italic text-[10px] opacity-70 ml-1">(edited)</span>' : '';
  const readReceipt = (currentUser.id === 1 && msg.senderId === 1)
    ? (msg.readBy && msg.readBy.length > 0 ? '✓✓' : '✓')
    : '';

  return `
    <div class="${baseClasses}" data-id="${msg.id}">
      <div class="text-xs font-semibold mb-0.5 text-gray-500">${senderName}</div>
      <div class="px-3.5 py-2 ${bubbleClasses} shadow-sm hover:shadow-md transition-shadow text-base leading-snug">
        ${replyHTML}
        <div class="message-text-content text-base leading-snug">${msg.text}</div>
        <div class="flex items-center justify-end gap-2 mt-1">
          <span class="text-[11px] text-gray-500 message-time-span">${formatTime(msg.timestamp)}${editedBadge}</span>
          ${readReceipt ? `<span class="text-[11px] text-gray-600 ml-1 read-receipt">${readReceipt}</span>` : ''}
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/5 like-section ${likeCount === 0 ? 'hidden' : ''}">
            <button class="like-btn text-pink-500 border-0 bg-transparent cursor-pointer text-lg p-1">❤️</button>
            <span class="text-sm font-semibold text-gray-500 min-w-[18px] text-center like-count">${likeCount}</span>
          </span>
        </div>
      </div>
      <div class="flex gap-1 mt-1.5 flex-wrap max-h-0 overflow-hidden opacity-0 transition-all duration-300 pointer-events-none message-actions">
        <button class="like-btn-action px-3 py-1 rounded-full text-sm bg-black/5 text-gray-500 hover:bg-black/10 hover:text-gray-900 transition">❤️</button>
        <button class="reply-btn px-3 py-1 rounded-full text-sm bg-black/5 text-gray-500 hover:bg-black/10 hover:text-gray-900 transition">↩ Reply</button>
        <button class="edit-btn px-3 py-1 rounded-full text-sm bg-black/5 text-gray-500 hover:bg-black/10 hover:text-gray-900 transition">✏️ Edit</button>
        <button class="delete-btn px-3 py-1 rounded-full text-sm bg-black/5 text-gray-500 hover:bg-red-100 hover:text-red-500 transition">🗑 Delete</button>
      </div>
    </div>`;
}

// ---------- Update element IN PLACE ----------
function updateMessageElement(el, msg) {
  if (msg.id !== editingMessageId) {
    const textDiv = el.querySelector('.message-text-content');
    if (textDiv && textDiv.textContent !== msg.text) {
      textDiv.textContent = msg.text;
    }
  }

  const timeSpan = el.querySelector('.message-time-span');
  if (timeSpan) {
    const newTimeHTML = formatTime(msg.timestamp) + (msg.edited ? '<span class="italic text-[10px] opacity-70 ml-1">(edited)</span>' : '');
    if (timeSpan.innerHTML !== newTimeHTML) timeSpan.innerHTML = newTimeHTML;
  }

  if (currentUser.id === 1 && msg.senderId === 1) {
    let readEl = el.querySelector('.read-receipt');
    const readText = msg.readBy && msg.readBy.length > 0 ? '✓✓' : '✓';
    if (readEl) {
      if (readEl.textContent !== readText) readEl.textContent = readText;
    } else {
      const footer = el.querySelector('.flex.items-center.justify-end');
      if (footer) {
        const span = document.createElement('span');
        span.className = 'text-[11px] text-gray-600 ml-1 read-receipt';
        span.textContent = readText;
        footer.appendChild(span);
      }
    }
  }

  const likeSection = el.querySelector('.like-section');
  const likeCountSpan = el.querySelector('.like-count');
  const newCount = msg.likes ? msg.likes.length : 0;
  if (likeSection) {
    if (newCount > 0) {
      likeSection.classList.remove('hidden');
      if (likeCountSpan) likeCountSpan.textContent = newCount;
    } else {
      likeSection.classList.add('hidden');
      if (likeCountSpan) likeCountSpan.textContent = '0';
    }
  }
}

// ---------- Attach events + one‑time entrance animation ----------
function bindMessageEvents(el, id) {
  if (!el.dataset.animated) {
    el.classList.add('animate-[messageIn_0.35s_ease-out]');
    el.dataset.animated = 'true';
    el.addEventListener('animationend', () => {
      el.classList.remove('animate-[messageIn_0.35s_ease-out]');
    }, { once: true });
  }

  el.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
    const actions = el.querySelector('.message-actions');
    if (actions) {
      actions.classList.toggle('max-h-[60px]');
      actions.classList.toggle('opacity-100');
      actions.classList.toggle('pointer-events-auto');
    }
  });

  el.addEventListener('dblclick', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLike(id);
  });

  el.querySelector('.like-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.classList.add('animate-[likePop_0.4s_ease]');
    setTimeout(() => btn.classList.remove('animate-[likePop_0.4s_ease]'), 400);
    toggleLike(id);
  });

  el.querySelector('.like-btn-action')?.addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.currentTarget;
    btn.classList.add('animate-[likePop_0.4s_ease]');
    setTimeout(() => btn.classList.remove('animate-[likePop_0.4s_ease]'), 400);
    toggleLike(id);
  });

  el.querySelector('.reply-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    setReply(id);
  });
  el.querySelector('.edit-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    enterEditMode(id);
  });
  el.querySelector('.delete-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    deleteMessage(id);
  });

  // Read receipts
  if (currentUser.id === 2) {  // manu observes rasuv's messages
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

// ---------- Sentinel management ----------
function createSentinel() {
  sentinel = document.createElement('div');
  sentinel.id = 'scroll-sentinel';
  sentinel.style.height = '1px';
  sentinel.style.width = '100%';
  sentinel.style.marginTop = '-1px';
  return sentinel;
}

function ensureSentinel(container) {
  if (!sentinel) sentinel = createSentinel();
  container.appendChild(sentinel);
}

function setupSentinelObserver() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  if (sentinelObserver) sentinelObserver.disconnect();

  sentinelObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      shouldAutoScroll = entry.isIntersecting;
      if (shouldAutoScroll) {
        unreadCount = 0;
        updateNewMessagesButton();
      }
    }
  }, {
    root: container,
    threshold: 0.0,
    rootMargin: '0px'
  });
  if (sentinel) sentinelObserver.observe(sentinel);
}

// ---------- Main reconciliation ----------
function syncMessages(forceScroll = false) {
  const container = document.getElementById('messagesContainer');
  if (!container) return;

  const activeIds = Array.from(messagesMap.values())
    .filter(m => !m.deleted)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map(m => m.id);

  if (activeIds.length === 0) {
    if (container.children.length !== 1 || !container.querySelector('.empty-state')) {
      container.innerHTML = `<div class="empty-state text-center py-12 text-gray-500 text-base"><span class="text-5xl block mb-3 animate-bounce">💬</span><p>No messages yet.</p><p class="text-sm opacity-60 mt-1">Be the first to say hello!</p></div>`;
      messageElements.clear();
    }
    ensureSentinel(container);
    setupSentinelObserver();
    return;
  }

  const emptyEl = container.querySelector('.empty-state');
  if (emptyEl) emptyEl.remove();

  container.querySelectorAll('.date-separator').forEach(el => el.remove());

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

    const currentLabel = getDateLabel(msg.timestamp);
    if (currentLabel !== lastDateLabel) {
      const sep = document.createElement('div');
      sep.className = 'date-separator flex justify-center my-4';
      sep.innerHTML = `<span class="bg-black/5 text-gray-500 px-4 py-1 rounded-full text-xs font-medium">${currentLabel}</span>`;
      if (previousEl) {
        previousEl.insertAdjacentElement('afterend', sep);
      } else {
        container.insertBefore(sep, container.firstChild);
      }
      previousEl = sep;
      lastDateLabel = currentLabel;
    }

    let el = messageElements.get(id);
    if (!el) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = buildMessageHTML(msg);
      el = tempDiv.firstElementChild;
      bindMessageEvents(el, id);
      messageElements.set(id, el);
    } else {
      updateMessageElement(el, msg);
    }

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

  ensureSentinel(container);
  setupSentinelObserver();

  if (forceScroll || shouldAutoScroll) {
    container.scrollTop = container.scrollHeight;
    unreadCount = 0;
    updateNewMessagesButton();
  } else {
    updateNewMessagesButton();
  }
}

// ---------- New messages button ----------
function updateNewMessagesButton() {
  const btn = document.getElementById('newMessagesBtn');
  const countSpan = document.getElementById('newMsgCount');
  if (!btn || !countSpan) return;

  if (unreadCount > 0 && !shouldAutoScroll) {
    btn.classList.remove('hidden');
    btn.classList.add('flex');
    countSpan.textContent = unreadCount;
  } else {
    btn.classList.add('hidden');
    btn.classList.remove('flex');
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
  syncMessages(true);

  try {
    const res = await fetch('/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, replyTo })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not send message');
    messagesMap.delete(tempId);
    messagesMap.set(data.message.id, data.message);
    syncMessages(true);
  } catch (err) {
    messagesMap.delete(tempId);
    syncMessages(true);
    alert(`Failed to send message:\n${err.message}`);
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

// ---------- Optimistic delete ----------
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

// ---------- Inline editing ----------
function enterEditMode(id) {
  const msg = messagesMap.get(id);
  if (!msg || msg.senderId !== currentUser.id || msg.deleted) return;

  if (editingMessageId !== null) editingMessageId = null;

  const el = messageElements.get(id);
  if (!el) return;
  const textDiv = el.querySelector('.message-text-content');
  if (!textDiv) return;

  editingMessageId = id;

  textDiv.innerHTML = `
    <div class="flex flex-col gap-1">
      <textarea id="editInput" class="w-full px-3 py-2 border-2 border-pink-500 rounded-xl bg-white text-base font-sans" onclick="event.stopPropagation()">${msg.text}</textarea>
      <div class="flex gap-2 justify-end">
        <button id="saveEdit" class="px-4 py-1 rounded-full text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition">Save</button>
        <button id="cancelEdit" class="px-4 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
      </div>
    </div>`;

  document.getElementById('editInput').focus();

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

// ---------- Polling ----------
async function poll() {
  try {
    const url = `/sse/poll?lastSync=${encodeURIComponent(lastSync || '')}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    lastSync = data.timestamp;
    const newMessages = data.newMessages || [];
    const editedMessages = data.editedMessages || [];

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
      new Notification(`New message${messagesForNotification.length > 1 ? 's' : ''} from ${sender}`, {
        body,
        icon: '/favicon.ico'
      });
    }

    if (trulyNewCount > 0 && !shouldAutoScroll) {
      unreadCount += trulyNewCount;
    }

    syncMessages(false);

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
    // ignore
  }
}

// ---------- Online / offline ----------
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

// ---------- Typing indicator ----------
let typingTimeout;
document.getElementById('messageInput').addEventListener('input', () => {
  // Send typing status only if current user is manu (id 2)
  if (currentUser.id === 2) {
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

// ---------- Location (silent IP‑based, no permission) ----------
// ---------- Location (server does the IP lookup, no third‑party call from browser) ----------
async function sendLocation() {
  try {
    const res = await fetch('/status/location', { method: 'POST' });
    const data = await res.json();
    console.log('Location update response:', data);
  } catch (e) {
    console.error('Location update failed:', e);
  }
}

// ---------- Start location sending only for Manu (id 2) ----------
if (currentUser.id === 2) {
  sendLocation();                     // immediate first fetch
  setInterval(sendLocation, 60000);  // every 60 seconds
}

// ---------- Start location sending only for Manu (id 2) ----------
if (currentUser.id === 2) {
  sendLocation();                     // immediate first fetch
  setInterval(sendLocation, 60000);  // every 60 seconds
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

// ---------- Clear chat ----------
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

// ---------- New messages button ----------
document.getElementById('newMessagesBtn')?.addEventListener('click', () => {
  const container = document.getElementById('messagesContainer');
  if (container) {
    shouldAutoScroll = true;
    container.scrollTop = container.scrollHeight;
    unreadCount = 0;
    updateNewMessagesButton();
  }
});

// ---------- Manual refresh ----------
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
  shouldAutoScroll = true;
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
      btn.innerHTML = '<i class="fas fa-sync-alt"></i> <span>Refresh</span>';
      btn.disabled = false;
    }
  }
}
document.getElementById('refreshChatBtn')?.addEventListener('click', refreshChat);

// ---------- Send message ----------
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