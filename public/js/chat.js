// ==========================
//  Campusfify Chat – Rebuilt
// ==========================

const me = window.USER;
const POLL_MS = 1000;
const HB_MS = 5000;
const SEND_TIMEOUT_MS = 10000;
const MAX_TA_HEIGHT = 112;
const MAX_NOTIF_IDS = 100;

// ---- State ----
const msgs = new Map();
const els = new Map();
const sepEls = new Map();
let lastSync = null;
let replyToId = null;
let activeId = null;
let editingId = null;
let isSending = false;
let sendAbort = null;
let unread = 0;
let autoScroll = true;
let pollTimer = null;
let hbTimer = null;
let typingTimer = null;
let typingInterval = null;
let tempId = -1;
let loaded = false;
let inEdit = false;
const notifIds = new Set();
const pendingLikes = new Set();

const $ = (sel) => document.getElementById(sel);
const container = $('messages');

// ---- Time ----
function fmtTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  if (d.toDateString() === now.toDateString()) return t;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `Yesterday at ${t}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ` at ${t}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

// ---- DOM builders ----
function createMsgEl(m) {
  const mine = m.senderId === me.id;
  const sender = m.senderId === 1 ? 'rasuv' : 'manu';

  const msg = document.createElement('div');
  msg.className = 'msg';
  msg.dataset.id = m.id;
  if (mine) msg.dataset.mine = '';
  msg.dataset.sender = m.senderId;

  const senderEl = document.createElement('div');
  senderEl.className = 'msg-sender';
  senderEl.textContent = sender;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (m.replyTo) {
    const parent = msgs.get(m.replyTo);
    const replyBox = document.createElement('div');
    replyBox.className = 'msg-reply';
    const strong = document.createElement('strong');
    strong.textContent = '↩ ' + (parent ? (parent.senderId === 1 ? 'rasuv' : 'manu') : 'unknown');
    replyBox.appendChild(strong);
    const preview = document.createElement('div');
    preview.textContent = parent ? (parent.deleted ? '[deleted]' : parent.text) : '[not loaded]';
    replyBox.appendChild(preview);
    bubble.appendChild(replyBox);
  }

  const text = document.createElement('div');
  text.className = 'msg-text';
  text.textContent = m.text;
  bubble.appendChild(text);

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const time = document.createElement('time');
  time.textContent = fmtTime(m.timestamp);
  meta.appendChild(time);

  if (m.edited) {
    const edited = document.createElement('span');
    edited.className = 'msg-edited';
    edited.textContent = '(edited)';
    meta.appendChild(edited);
  }

  if (me.id === 1 && mine) {
    const read = document.createElement('span');
    read.className = 'msg-read';
    read.textContent = (m.readBy || []).length > 0 ? '✓✓' : '✓';
    meta.appendChild(read);
  }

  if (m.likes?.length) {
    const likeBtn = document.createElement('button');
    likeBtn.type = 'button';
    likeBtn.className = 'msg-like';
    likeBtn.innerHTML = `❤️ <span>${m.likes.length}</span>`;
    meta.appendChild(likeBtn);
  }
  bubble.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  const defs = [
    { cls: 'act-like', text: '❤️ Like', cb: () => toggleLike(m.id) },
    { cls: 'act-reply', text: '↩ Reply', cb: () => setReply(m.id) },
  ];
  if (mine) {
    defs.push({ cls: 'act-edit', text: '✏️ Edit', cb: () => enterEdit(m.id) });
    defs.push({ cls: 'act-del', text: '🗑 Delete', cb: () => del(m.id) });
  }
  defs.forEach(a => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = a.cls;
    b.textContent = a.text;
    b.addEventListener('click', (e) => { e.stopPropagation(); a.cb(); });
    actions.appendChild(b);
  });

  msg.appendChild(senderEl);
  msg.appendChild(bubble);
  msg.appendChild(actions);

  if (me.id === 2 && m.senderId === 1 && !(m.readBy || []).includes(2)) {
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetch(`/messages/${m.id}/read`, { method: 'POST' }).catch(() => {});
        io.disconnect();
      }
    }, { threshold: 1.0 });
    io.observe(msg);
  }
  return msg;
}

function updateMsgEl(el, m) {
  if (m.id === editingId) return;
  el.classList.toggle('deleted', m.deleted);

  const text = el.querySelector('.msg-text');
  if (text && text.textContent !== m.text) text.textContent = m.text;

  const time = el.querySelector('time');
  if (time) time.textContent = fmtTime(m.timestamp);

  let edited = el.querySelector('.msg-edited');
  if (m.edited) {
    if (!edited) {
      edited = document.createElement('span');
      edited.className = 'msg-edited';
      edited.textContent = '(edited)';
      const meta = el.querySelector('.msg-meta');
      if (meta) meta.insertBefore(edited, meta.children[1] || null);
    }
  } else if (edited) {
    edited.remove();
  }

  if (me.id === 1 && m.senderId === me.id) {
    let read = el.querySelector('.msg-read');
    const txt = (m.readBy || []).length > 0 ? '✓✓' : '✓';
    if (!read) {
      read = document.createElement('span');
      read.className = 'msg-read';
      const meta = el.querySelector('.msg-meta');
      if (meta) meta.appendChild(read);
    }
    if (read.textContent !== txt) read.textContent = txt;
  }

  let like = el.querySelector('.msg-like');
  if (m.likes?.length) {
    if (!like) {
      like = document.createElement('button');
      like.type = 'button';
      like.className = 'msg-like';
      const meta = el.querySelector('.msg-meta');
      if (meta) meta.appendChild(like);
    }
    like.innerHTML = `❤️ <span>${m.likes.length}</span>`;
  } else if (like) {
    like.remove();
  }
}

// ---- Stable sync ----
function sync(forceScroll = false) {
  const list = [...msgs.values()]
    .filter(m => !m.deleted)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  if (!list.length) {
    for (const [id, el] of els) {
      if (activeId === id) hideActions();
      if (editingId === id) exitEdit();
      el.remove();
    }
    els.clear();
    for (const [, el] of sepEls) el.remove();
    sepEls.clear();
    $('emptyState').classList.remove('hidden');
    return;
  }

  $('emptyState').classList.add('hidden');
  const activeIds = new Set(list.map(m => m.id));

  for (const [id, el] of els) {
    if (!activeIds.has(id)) {
      if (editingId === id) exitEdit();
      if (activeId === id) hideActions();
      el.remove();
      els.delete(id);
    }
  }

  const needed = new Set();
  let prevLabel = null;
  for (const m of list) {
    const lab = fmtDate(m.timestamp);
    if (lab !== prevLabel) { needed.add(lab); prevLabel = lab; }
  }
  for (const [lab, el] of sepEls) {
    if (!needed.has(lab)) { el.remove(); sepEls.delete(lab); }
  }

  let anchor = container.firstChild;
  prevLabel = null;

  for (const m of list) {
    const lab = fmtDate(m.timestamp);
    if (lab !== prevLabel) {
      let sep = sepEls.get(lab);
      if (!sep) {
        sep = document.createElement('div');
        sep.className = 'date-sep';
        sep.innerHTML = `<span>${lab}</span>`;
        sepEls.set(lab, sep);
      }
      if (anchor !== sep) container.insertBefore(sep, anchor);
      anchor = sep.nextSibling;
      prevLabel = lab;
    }

    let el = els.get(m.id);
    if (!el) {
      el = createMsgEl(m);
      els.set(m.id, el);
    } else {
      updateMsgEl(el, m);
    }
    if (anchor !== el) container.insertBefore(el, anchor);
    anchor = el.nextSibling;
  }

  if (forceScroll || autoScroll) { scrollToBottom(); unread = 0; }
  updateNewMsgBtn();
}

function scrollToBottom() {
  container.scrollTop = container.scrollHeight;
}

// ---- Actions ----
function showActions(id) {
  hideActions();
  activeId = id;
  const el = els.get(id);
  if (el) el.classList.add('active');
}

function hideActions() {
  if (activeId == null) return;
  const el = els.get(activeId);
  if (el) el.classList.remove('active');
  activeId = null;
}

// ---- Edit ----
function enterEdit(id) {
  const m = msgs.get(id);
  if (!m || m.senderId !== me.id || m.deleted) return;
  hideActions();
  if (editingId !== null) exitEdit();
  editingId = id;

  const el = els.get(id);
  const bubble = el.querySelector('.msg-bubble');
  const text = bubble.querySelector('.msg-text');
  text.style.display = 'none';

  const box = document.createElement('div');
  box.className = 'edit-box';

  const ta = document.createElement('textarea');
  ta.className = 'edit-ta';
  ta.rows = 2;
  ta.value = m.text;
  ta.inputMode = 'text';
  ta.autocomplete = 'off';

  const row = document.createElement('div');
  row.className = 'edit-row';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'edit-save';
  save.textContent = 'Save';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'edit-cancel';
  cancel.textContent = 'Cancel';

  row.appendChild(save);
  row.appendChild(cancel);
  box.appendChild(ta);
  box.appendChild(row);
  bubble.appendChild(box);

  requestAnimationFrame(() => {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  save.addEventListener('click', () => {
    const v = ta.value.trim();
    exitEdit();
    if (v) edit(id, v);
  });
  cancel.addEventListener('click', () => exitEdit());
}

function exitEdit() {
  if (editingId == null) return;
  const el = els.get(editingId);
  if (el) {
    const bubble = el.querySelector('.msg-bubble');
    const box = bubble.querySelector('.edit-box');
    if (box) box.remove();
    const text = bubble.querySelector('.msg-text');
    if (text) text.style.display = '';
  }
  editingId = null;
}

// ---- Reply ----
function setReply(id) {
  hideActions();
  replyToId = id;
  const m = msgs.get(id);
  const txt = $('replyText');
  if (m) txt.textContent = `Replying to ${m.senderId === 1 ? 'rasuv' : 'manu'}: ${m.deleted ? '[deleted]' : m.text}`;
  else txt.textContent = 'Replying to unavailable message';
  $('replyBar').classList.remove('hidden');
}

function cancelReply() {
  replyToId = null;
  $('replyBar').classList.add('hidden');
}

// ---- Mutations ----
async function send(text, replyTo) {
  if (isSending) return;
  isSending = true;
  const btn = $('sendBtn');
  const ta = $('msgInput');
  btn.disabled = true;
  ta.disabled = true;
  btn.setAttribute('aria-busy', 'true');
  btn.textContent = '…';

  const temp = {
    id: tempId--, senderId: me.id, text, timestamp: new Date().toISOString(),
    edited: false, deleted: false, replyTo, likes: [], readBy: []
  };
  msgs.set(temp.id, temp);
  sync(true);

  const ctrl = new AbortController();
  sendAbort = ctrl;
  const to = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch('/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, replyTo }), signal: ctrl.signal
    });
    clearTimeout(to);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Send failed');
    msgs.delete(temp.id);
    msgs.set(data.message.id, data.message);
    sync(true);
  } catch (err) {
    if (err.name !== 'AbortError') alert('Failed to send: ' + err.message);
    msgs.delete(temp.id);
    sync(true);
  } finally {
    isSending = false; sendAbort = null;
    btn.disabled = false; ta.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = 'Send';
  }
}

async function toggleLike(id) {
  if (pendingLikes.has(id)) return;
  pendingLikes.add(id);

  const m = msgs.get(id);
  if (!m) { pendingLikes.delete(id); return; }
  const before = [...(m.likes || [])];
  const idx = before.indexOf(me.id);
  const after = [...before];
  if (idx === -1) after.push(me.id); else after.splice(idx, 1);
  m.likes = after;
  m.likesUpdatedAt = new Date().toISOString();
  sync();

  const el = els.get(id);
  const likeBtn = el?.querySelector('.msg-like');
  if (likeBtn) {
    likeBtn.classList.remove('liking');
    void likeBtn.offsetWidth;
    likeBtn.classList.add('liking');
    setTimeout(() => likeBtn.classList.remove('liking'), 400);
  }

  try {
    const res = await fetch(`/messages/${id}/like`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Like failed');
    if (data.message) {
      msgs.set(id, { ...m, ...data.message });
      sync();
    }
  } catch (err) {
    m.likes = before; m.likesUpdatedAt = null; sync();
    alert('Failed to like: ' + err.message);
  } finally {
    pendingLikes.delete(id);
  }
}

async function edit(id, text) {
  const m = msgs.get(id);
  if (!m) return;
  const oldText = m.text, oldEdited = m.edited;
  m.text = text; m.edited = true; m.editedAt = new Date().toISOString();
  sync();

  try {
    const res = await fetch(`/messages/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Edit failed');
    if (data.message) {
      msgs.set(id, { ...m, ...data.message });
      sync();
    }
  } catch (err) {
    m.text = oldText; m.edited = oldEdited; m.editedAt = null; sync();
    alert('Failed to edit: ' + err.message);
  }
}

async function del(id) {
  if (!confirm('Delete this message?')) return;
  const m = msgs.get(id);
  if (!m) return;
  const was = m.deleted;
  m.deleted = true; m.edited = true; m.editedAt = new Date().toISOString();
  sync();

  try {
    const res = await fetch(`/messages/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Delete failed');
    if (data.message) {
      msgs.set(id, { ...m, ...data.message });
      sync();
    }
  } catch (err) {
    m.deleted = was; m.edited = false; m.editedAt = null; sync();
    alert('Failed to delete: ' + err.message);
  }
}

// ---- Typing ----
function showTyping(status) {
  const el = $('typing');
  const txt = $('typingText');
  if (!el || !txt) return;
  if (status?.isTyping) {
    el.classList.remove('hidden');
    if (typingInterval) clearInterval(typingInterval);
    const start = new Date(status.typingUpdatedAt);
    const tick = () => {
      const s = Math.floor((Date.now() - start) / 1000);
      let d = 'just now';
      if (s >= 5 && s < 60) d = `${s}s ago`;
      else if (s >= 60) d = `${Math.floor(s / 60)}m ago`;
      txt.textContent = `manu is typing… (${d})`;
    };
    tick(); typingInterval = setInterval(tick, 1000);
  } else {
    el.classList.add('hidden');
    if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }
  }
}

// ---- Polling ----
async function poll() {
  try {
    const url = `/sse/poll?lastSync=${encodeURIComponent(lastSync || '')}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return;

    lastSync = data.timestamp;
    const incoming = [...(data.newMessages || []), ...(data.editedMessages || [])];
    let added = 0;
    const toNotify = [];

    for (const m of incoming) {
      const ex = msgs.get(m.id);
      const newer = !ex ||
        new Date(m.editedAt || 0) > new Date(ex.editedAt || 0) ||
        new Date(m.likesUpdatedAt || 0) > new Date(ex.likesUpdatedAt || 0);
      if (!newer) continue;
      if (!ex) { added++; if (m.senderId !== me.id) toNotify.push(m); }
      msgs.set(m.id, m);
    }

    sync(false);

    // Recompute autoScroll after DOM update to detect if user is truly at bottom
    autoScroll = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
    if (added > 0 && !autoScroll) unread += added;
    if (autoScroll) { unread = 0; }
    updateNewMsgBtn();

    if (me.id === 1 && document.visibilityState === 'hidden' && Notification.permission === 'granted') {
      for (const m of toNotify) {
        if (notifIds.has(m.id)) continue;
        notifIds.add(m.id);
        if (notifIds.size > MAX_NOTIF_IDS) {
          const first = notifIds.values().next().value;
          notifIds.delete(first);
        }
        const sender = m.senderId === 1 ? 'rasuv' : 'manu';
        new Notification(`New message from ${sender}`, { body: m.text.substring(0, 100), icon: '/favicon.ico' });
      }
    }
    if (me.id === 1) showTyping(data.manuStatus);
  } catch (e) { /* ignore */ }
}

// ---- Heartbeat ----
function sendHb(online) {
  fetch('/status/online', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline: online })
  }).catch(() => {});
}

function startHb() {
  if (hbTimer) return;
  sendHb(true);
  hbTimer = setInterval(() => sendHb(true), HB_MS);
}

function stopHb() {
  if (!hbTimer) return;
  clearInterval(hbTimer); hbTimer = null;
  sendHb(false);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopHb();
    if (isSending && sendAbort) sendAbort.abort();
  } else {
    startHb();
  }
});

window.addEventListener('beforeunload', () => {
  const payload = JSON.stringify({ isOnline: false });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/status/online', new Blob([payload], { type: 'application/json' }));
  } else {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/status/online', false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    } catch (e) {}
  }
});
startHb();

// ---- Composer ----
const composer = $('composer');
const msgInput = $('msgInput');

composer.addEventListener('submit', (e) => {
  e.preventDefault();
  if (isSending) return;
  const text = msgInput.value.trim();
  if (!text) return;
  send(text, replyToId);
  msgInput.value = '';
  msgInput.style.height = 'auto';
  cancelReply();
});

msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  const h = Math.min(msgInput.scrollHeight, MAX_TA_HEIGHT);
  msgInput.style.height = h + 'px';
  msgInput.style.overflowY = msgInput.scrollHeight > MAX_TA_HEIGHT ? 'auto' : 'hidden';
});

// Typing indicator (manu only)
if (me.id === 2) {
  msgInput.addEventListener('input', () => {
    fetch('/status/typing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping: true, typingTo: 1 })
    }).catch(() => {});
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      fetch('/status/typing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false, typingTo: 1 })
      }).catch(() => {});
    }, 2000);
  });
}

// ---- Emoji picker ----
const EMOJIS = ['😀','😂','🤣','😍','😎','😢','😡','👍','👎','🎉','❤️','🔥','✅','⭐','💬','😜','🤔','🙏','✨','😭','😅','😊','🥰','😘','😴','🤗','🤩','🫶','💔'];
const emojiPicker = $('emojiPicker');
const emojiGrid = $('emojiGrid');
const emojiBtn = $('emojiBtn');

function buildEmoji() {
  emojiGrid.innerHTML = '';
  EMOJIS.forEach(em => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'emoji-item'; b.textContent = em;
    b.addEventListener('click', () => { insertEmoji(em); hideEmoji(); });
    emojiGrid.appendChild(b);
  });
}

function insertEmoji(emoji) {
  const s = msgInput.selectionStart, e = msgInput.selectionEnd, v = msgInput.value;
  msgInput.value = v.slice(0, s) + emoji + v.slice(e);
  msgInput.selectionStart = msgInput.selectionEnd = s + emoji.length;
  msgInput.focus();
  msgInput.dispatchEvent(new Event('input'));
}

function showEmoji() { emojiPicker.classList.remove('hidden'); }
function hideEmoji() { emojiPicker.classList.add('hidden'); }

emojiBtn.addEventListener('click', (e) => { e.stopPropagation(); emojiPicker.classList.contains('hidden') ? showEmoji() : hideEmoji(); });
$('emojiClose').addEventListener('click', hideEmoji);
document.addEventListener('click', (e) => { if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) hideEmoji(); });
buildEmoji();

// ---- Event delegation ----
document.addEventListener('click', (e) => { inEdit = !!e.target.closest('.edit-box'); }, true);
document.addEventListener('touchend', (e) => { inEdit = !!e.target.closest('.edit-box'); }, true);

container.addEventListener('click', (e) => {
  if (inEdit) return;
  const heart = e.target.closest('.msg-like');
  if (heart) { toggleLike(Number(heart.closest('.msg').dataset.id)); return; }
  const msg = e.target.closest('.msg');
  if (msg) { const id = Number(msg.dataset.id); activeId === id ? hideActions() : showActions(id); return; }
  hideActions();
});

container.addEventListener('dblclick', (e) => {
  if (inEdit) return;
  const msg = e.target.closest('.msg');
  if (msg) toggleLike(Number(msg.dataset.id));
});

container.addEventListener('scroll', () => {
  autoScroll = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
  if (autoScroll) { unread = 0; updateNewMsgBtn(); }
  hideActions();
}, { passive: true });

// ---- Buttons ----
function updateNewMsgBtn() {
  const btn = $('newMsgs');
  if (!btn) return;
  if (unread > 0 && !autoScroll) { btn.classList.remove('hidden'); $('newMsgCount').textContent = unread; }
  else btn.classList.add('hidden');
}

$('newMsgs').addEventListener('click', () => { autoScroll = true; scrollToBottom(); unread = 0; updateNewMsgBtn(); });
$('cancelReply').addEventListener('click', cancelReply);

document.querySelectorAll('.js-refresh').forEach(b => b.addEventListener('click', refresh));
document.querySelectorAll('.js-clear').forEach(b => b.addEventListener('click', clearAll));


// Mobile menu auto-close
document.querySelectorAll('.nav-mobile .menu button, .nav-mobile .menu a').forEach(item => {
  item.addEventListener('click', () => {
    const details = item.closest('.nav-mobile');
    if (details) details.open = false;
  });
});

async function refresh() {
  const btns = document.querySelectorAll('.js-refresh');
  btns.forEach(b => { b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; });
  msgs.clear();
  els.forEach(el => el.remove()); els.clear();
  sepEls.forEach(el => el.remove()); sepEls.clear();
  lastSync = null; unread = 0; editingId = null; activeId = null; autoScroll = true;
  updateNewMsgBtn();
  try {
    const res = await fetch('/api/messages');
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    data.forEach(m => msgs.set(m.id, m));
    sync(true);
    const sorted = [...msgs.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lastSync = sorted.length ? sorted[sorted.length - 1].timestamp : new Date().toISOString();
  } catch (err) { alert('Refresh failed: ' + err.message); }
  finally { btns.forEach(b => { b.disabled = false; b.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh'; }); }
}

async function clearAll() {
  if (!confirm('Delete all messages for both users?')) return;
  try {
    const res = await fetch('/messages/all', { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Clear failed');
    msgs.clear(); sync(true);
  } catch (err) { alert('Clear failed: ' + err.message); }
}

// ---- Init ----
async function init() {
  if (me.id === 1 && 'Notification' in window && Notification.permission === 'default') {
    document.body.addEventListener('click', function req() {
      Notification.requestPermission();
      document.body.removeEventListener('click', req);
    }, { once: true });
  }
  try {
    const res = await fetch('/api/messages');
    if (!res.ok) throw new Error('Load failed');
    const data = await res.json();
    data.forEach(m => msgs.set(m.id, m));
    sync(true);
    const sorted = [...msgs.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    lastSync = sorted.length ? sorted[sorted.length - 1].timestamp : new Date().toISOString();
    loaded = true;
  } catch (err) {
    console.error(err);
    lastSync = new Date().toISOString();
    loaded = true;
  }
  pollTimer = setInterval(poll, POLL_MS);
}

if (me.id === 2) {
  fetch('/status/location', { method: 'POST' }).catch(() => {});
  setInterval(() => fetch('/status/location', { method: 'POST' }).catch(() => {}), 60000);
}

init();