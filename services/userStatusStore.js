// services/userStatusStore.js
// Server‑authoritative online/typing store.

// ─── Maps ───────────────────────────────────────────
const heartbeats   = new Map();   // userId → last heartbeat timestamp (ms)
const typingMap    = new Map();   // userId → { started: timestamp }
const typingTimers = new Map();   // userId → auto‑clear timeout
const locations    = new Map();   // userId → location data

// ═══════════════════════════════════════════════════════
// SEED both users so they always appear in status calls
// (prevents "no user found" on dashboard)
heartbeats.set(1, 0);   // user 1 – never online yet
heartbeats.set(2, 0);   // user 2 – never online yet
// ═══════════════════════════════════════════════════════

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
    // Don't delete; keep the entry but mark offline
    heartbeats.set(userId, 0);
  }
}

function isUserOnline(userId) {
  const last = heartbeats.get(userId);
  if (last === undefined || last === 0) return false;
  return Date.now() - last < ONLINE_TIMEOUT_MS;
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
/**
 * Returns the full status object for a user.
 * If the user has never sent a heartbeat, returns a default offline status.
 */
function getStatus(userId) {
  const last = heartbeats.get(userId);
  if (last === undefined) {
    // Should not happen because of seeding, but fallback to offline
    return {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null
    };
  }

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
    lastSeen: last === 0 ? new Date(0).toISOString() : new Date(last).toISOString(),
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