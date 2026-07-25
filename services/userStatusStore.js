// services/userStatusStore.js
// MongoDB‑backed store – survives server restarts.

const UserStatus = require('../models/UserStatus');

// ─── Timeouts ───────────────────────────────────────
const ONLINE_TIMEOUT_MS = 15_000;   // 15s without heartbeat → offline
const TYPING_EXPIRE_MS  = 5_000;    // auto‑stop typing after 5s

// In‑memory typing timers (for immediate auto‑clear)
const typingTimers = new Map();   // userId → timeoutId

// ─── Core heartbeat (called by middleware) ──────────
async function touchActivity(userId) {
  const now = new Date();
  await UserStatus.findOneAndUpdate(
    { userId },
    {
      lastHeartbeat: now,
      lastOnlineTime: now,
      isOnline: true
    },
    { upsert: true, new: true }
  );
}

// ─── Online (explicit setOnline, used by statusController) ──
async function setOnline(userId, isOnline) {
  if (isOnline) {
    return touchActivity(userId);
  } else {
    await UserStatus.findOneAndUpdate(
      { userId },
      {
        lastHeartbeat: new Date(0),   // ancient → offline
        isOnline: false
        // DO NOT update lastOnlineTime
      },
      { upsert: true }
    );
  }
}

async function isUserOnline(userId) {
  const doc = await UserStatus.findOne({ userId });
  if (!doc || !doc.lastHeartbeat) return false;
  return Date.now() - new Date(doc.lastHeartbeat).getTime() < ONLINE_TIMEOUT_MS;
}

// ─── Typing ─────────────────────────────────────────
async function setTyping(userId, isTyping) {
  if (typingTimers.has(userId)) {
    clearTimeout(typingTimers.get(userId));
    typingTimers.delete(userId);
  }

  if (isTyping) {
    const now = new Date();
    await UserStatus.findOneAndUpdate(
      { userId },
      { isTyping: true, typingStarted: now },
      { upsert: true }
    );

    const timer = setTimeout(async () => {
      try {
        await UserStatus.findOneAndUpdate(
          { userId },
          { isTyping: false, typingStarted: null }
        );
      } catch (e) { /* ignore */ }
      typingTimers.delete(userId);
    }, TYPING_EXPIRE_MS);
    typingTimers.set(userId, timer);
  } else {
    await UserStatus.findOneAndUpdate(
      { userId },
      { isTyping: false, typingStarted: null },
      { upsert: true }
    );
  }
}

async function clearTyping(userId) {
  await setTyping(userId, false);
}

// ─── Combined status (used by pollController) ───────
async function getStatus(userId) {
  let doc = await UserStatus.findOne({ userId });
  if (!doc) {
    return {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null
    };
  }

  const now = Date.now();

  let isOnline = false;
  if (doc.lastHeartbeat && doc.lastHeartbeat.getTime() > 0) {
    const heartbeatAge = now - doc.lastHeartbeat.getTime();
    isOnline = heartbeatAge < ONLINE_TIMEOUT_MS;
  }
  if (doc.isOnline !== isOnline) {
    await UserStatus.findOneAndUpdate({ userId }, { isOnline });
  }

  let isTyping = false;
  let typingUpdatedAt = null;
  if (doc.isTyping && doc.typingStarted) {
    const typingAge = now - doc.typingStarted.getTime();
    if (typingAge < TYPING_EXPIRE_MS) {
      isTyping = true;
      typingUpdatedAt = doc.typingStarted.toISOString();
    } else {
      await UserStatus.findOneAndUpdate(
        { userId },
        { isTyping: false, typingStarted: null }
      );
    }
  }

  return {
    isOnline,
    lastSeen: doc.lastOnlineTime ? doc.lastOnlineTime.toISOString() : new Date(0).toISOString(),
    isTyping,
    typingUpdatedAt
  };
}

// ─── Location ───────────────────────────────────────
async function setLocation(userId, locationData) {
  await UserStatus.findOneAndUpdate(
    { userId },
    { currentLocation: locationData },
    { upsert: true }
  );
}

async function getAllStatuses() {
  const docs = await UserStatus.find({});
  const result = {};

  for (const doc of docs) {
    const status = await getStatus(doc.userId);
    result[doc.userId] = { ...status, location: doc.currentLocation || null };
  }

  // ═══ FALLBACK: guarantee both users appear ═══
  if (!result[1]) {
    result[1] = {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null,
      location: null
    };
  }
  if (!result[2]) {
    result[2] = {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null,
      location: null
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