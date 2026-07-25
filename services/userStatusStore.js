// services/userStatusStore.js
// In‑memory store with server‑side online/typing timeouts

const heartbeats = new Map();   // userId → last heartbeat timestamp (ms)
const typingMap = new Map();    // userId → { started: timestamp }
const typingTimers = new Map(); // userId → auto‑clear timeout
const locations = new Map();    // userId → location data

// ── SEED both users so they ALWAYS appear in status calls ──
heartbeats.set(1, 0);
heartbeats.set(2, 0);

// ─── Timeouts ───────────────────────────────────────
const ONLINE_TIMEOUT_MS = 15_000;   // 15s without heartbeat → offline
const TYPING_EXPIRE_MS  = 5_000;    // auto‑stop typing after 5s

// ─── Core heartbeat ─────────────────────────────────
function touchActivity(userId) {
  heartbeats.set(userId, Date.now());
}

// ─── Online ─────────────────────────────────────────
function setOnline(userId, isOnline) {
  if (isOnline) {
    heartbeats.set(userId, Date.now());
  } else {
    heartbeats.set(userId, 0);   // offline, but keep entry
  }
}

function isUserOnline(userId) {
  const last = heartbeats.get(userId);
  if (last === undefined || last === 0) return false;
  return Date.now() - last < ONLINE_TIMEOUT_MS;
}

// ─── Typing ─────────────────────────────────────────
function setTyping(userId, isTyping) {
  // Clear any existing auto‑clear timer
  if (typingTimers.has(userId)) {
    clearTimeout(typingTimers.get(userId));
    typingTimers.delete(userId);
  }

  if (isTyping) {
    typingMap.set(userId, { started: Date.now() });

    const timer = setTimeout(() => {
      typingMap.delete(userId);
      typingTimers.delete(userId);
    }, TYPING_EXPIRE_MS);
    typingTimers.set(userId, timer);
  } else {
    typingMap.delete(userId);
  }
}

function clearTyping(userId) {
  setTyping(userId, false);
}

// ─── Combined status ─────────────────────────────────
function getStatus(userId) {
  const last = heartbeats.get(userId);
  if (last === undefined) return null;

  const now = Date.now();
  const isOnline = last !== 0 && now - last < ONLINE_TIMEOUT_MS;

  let isTyping = false;
  let typingUpdatedAt = null;
  const typingInfo = typingMap.get(userId);
  if (typingInfo) {
    if (now - typingInfo.started < TYPING_EXPIRE_MS) {
      isTyping = true;
      typingUpdatedAt = new Date(typingInfo.started).toISOString();
    } else {
      typingMap.delete(userId);
      if (typingTimers.has(userId)) {
        clearTimeout(typingTimers.get(userId));
        typingTimers.delete(userId);
      }
    }
  }

  return {
    isOnline,
    lastSeen: last === 0 ? new Date(0).toISOString() : new Date(last).toISOString(),
    isTyping,
    typingUpdatedAt
  };
}

// ─── Location ───────────────────────────────────────
function setLocation(userId, locationData) {
  locations.set(userId, locationData);
}

function getAllStatuses() {
  const result = {};
  for (const [userId] of heartbeats) {
    result[userId] = {
      ...getStatus(userId),
      location: locations.get(userId) || null
    };
  }
  return result;
}

module.exports = {
  touchActivity,
  setOnline,
  setTyping,
  clearTyping,
  setLocation,
  getAllStatuses,
  getStatus,
  isUserOnline
};