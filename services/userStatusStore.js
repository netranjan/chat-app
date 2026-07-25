// services/userStatusStore.js
// Server‑authoritative online/typing store.

// ─── Maps ───────────────────────────────────────────
const heartbeats   = new Map();   // userId → last heartbeat timestamp (ms)
const typingMap    = new Map();   // userId → { started: timestamp }
const typingTimers = new Map();   // userId → auto‑clear timeout
const locations    = new Map();   // userId → location data

// ─── Timeouts ───────────────────────────────────────
const ONLINE_TIMEOUT_MS = 15_000;   // 15s without heartbeat → offline
const TYPING_EXPIRE_MS  = 5_000;    // auto‑stop typing after 5s

// ─── Core heartbeat ─────────────────────────────────
/**
 * Called by middleware on every authenticated request.
 */
function touchActivity(userId) {
  heartbeats.set(userId, Date.now());
}

// ─── Online (explicit setOnline for backward compat) ─
function setOnline(userId, isOnline) {
  if (isOnline) {
    heartbeats.set(userId, Date.now());
  } else {
    heartbeats.delete(userId);
  }
}

function isUserOnline(userId) {
  const last = heartbeats.get(userId);
  return last !== undefined && Date.now() - last < ONLINE_TIMEOUT_MS;
}

// ─── Typing ─────────────────────────────────────────
/**
 * Expected by statusController: setTyping(userId, true/false)
 */
function setTyping(userId, isTyping) {
  // Cancel any existing auto‑clear timer
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

// ─── Combined status (used by pollController) ───────
function getStatus(userId) {
  const last = heartbeats.get(userId);
  if (!last) return null;

  const now = Date.now();
  const isOnline = now - last < ONLINE_TIMEOUT_MS;

  let isTyping = false;
  let typingUpdatedAt = null;
  const typingInfo = typingMap.get(userId);
  if (typingInfo) {
    if (now - typingInfo.started < TYPING_EXPIRE_MS) {
      isTyping = true;
      typingUpdatedAt = new Date(typingInfo.started).toISOString();
    } else {
      // Expired – clean up
      typingMap.delete(userId);
      if (typingTimers.has(userId)) {
        clearTimeout(typingTimers.get(userId));
        typingTimers.delete(userId);
      }
    }
  }

  return {
    isOnline,
    lastSeen: new Date(last).toISOString(),
    isTyping,
    typingUpdatedAt
  };
}

// ─── Location (unchanged) ───────────────────────────
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

// ─── Exports ────────────────────────────────────────
module.exports = {
  // used by middleware in api/server.js
  touchActivity,
  // used by statusController
  setOnline,
  setTyping,
  clearTyping,
  setLocation,
  getAllStatuses,
  // used by pollController
  getStatus,
  isUserOnline
};