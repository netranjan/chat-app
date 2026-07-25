// services/userStatusStore.js
// MongoDB-backed online/typing store – survives server restarts.

const UserStatus = require('../models/UserStatus');

// ─── Timeouts ───────────────────────────────────────
const ONLINE_TIMEOUT_MS = 15_000;   // 15s without heartbeat → offline
const TYPING_EXPIRE_MS  = 5_000;    // auto‑stop typing after 5s

// In-memory typing timers (for auto-expiry)
const typingTimers = new Map();   // userId → timeoutId

// ─── Core heartbeat ─────────────────────────────────
/**
 * Called by middleware on every authenticated request.
 */
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

// ─── Online (explicit setOnline for backward compat) ─
async function setOnline(userId, isOnline) {
  const now = new Date();
  if (isOnline) {
    await UserStatus.findOneAndUpdate(
      { userId },
      { 
        lastHeartbeat: now,
        lastOnlineTime: now,
        isOnline: true
      },
      { upsert: true, new: true }
    );
  } else {
    // Mark offline but preserve lastOnlineTime
    await UserStatus.findOneAndUpdate(
      { userId },
      { 
        lastHeartbeat: null,
        isOnline: false
        // DO NOT update lastOnlineTime
      },
      { upsert: true }
    );
  }
}

async function isUserOnline(userId) {
  const status = await UserStatus.findOne({ userId });
  if (!status || !status.lastHeartbeat) return false;
  return Date.now() - new Date(status.lastHeartbeat).getTime() < ONLINE_TIMEOUT_MS;
}

// ─── Typing ─────────────────────────────────────────
async function setTyping(userId, isTyping) {
  // Clear any existing in-memory timer
  if (typingTimers.has(userId)) {
    clearTimeout(typingTimers.get(userId));
    typingTimers.delete(userId);
  }

  if (isTyping) {
    const now = new Date();
    await UserStatus.findOneAndUpdate(
      { userId },
      { 
        isTyping: true,
        typingStarted: now
      },
      { upsert: true, new: true }
    );

    // Auto-clear typing after expiry
    const timer = setTimeout(async () => {
      await UserStatus.findOneAndUpdate(
        { userId },
        { 
          isTyping: false,
          typingStarted: null
        }
      );
      typingTimers.delete(userId);
    }, TYPING_EXPIRE_MS);
    typingTimers.set(userId, timer);
  } else {
    await UserStatus.findOneAndUpdate(
      { userId },
      { 
        isTyping: false,
        typingStarted: null
      },
      { upsert: true }
    );
  }
}

async function clearTyping(userId) {
  await setTyping(userId, false);
}

// ─── Combined status (used by pollController) ───────
/**
 * Returns the full status object for a user.
 */
async function getStatus(userId) {
  let status = await UserStatus.findOne({ userId });
  
  if (!status) {
    return {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null
    };
  }

  const now = Date.now();
  
  // Check if heartbeat is stale
  let isOnline = false;
  if (status.lastHeartbeat) {
    const heartbeatAge = now - new Date(status.lastHeartbeat).getTime();
    isOnline = heartbeatAge < ONLINE_TIMEOUT_MS;
    
    // Update DB if status changed
    if (status.isOnline !== isOnline) {
      await UserStatus.findOneAndUpdate(
        { userId },
        { isOnline }
      );
    }
  }

  // Check if typing has expired
  let isTyping = false;
  let typingUpdatedAt = null;
  if (status.isTyping && status.typingStarted) {
    const typingAge = now - new Date(status.typingStarted).getTime();
    if (typingAge < TYPING_EXPIRE_MS) {
      isTyping = true;
      typingUpdatedAt = status.typingStarted.toISOString();
    } else {
      // Expired – update DB
      await UserStatus.findOneAndUpdate(
        { userId },
        { 
          isTyping: false,
          typingStarted: null
        }
      );
    }
  }

  return {
    isOnline,
    lastSeen: status.lastOnlineTime 
      ? status.lastOnlineTime.toISOString() 
      : new Date(0).toISOString(),
    isTyping,
    typingUpdatedAt
  };
}

// ─── Location ───────────────────────────────────────
async function setLocation(userId, locationData) {
  await UserStatus.findOneAndUpdate(
    { userId },
    { currentLocation: locationData },
    { upsert: true, new: true }
  );
}

async function getAllStatuses() {
  const statuses = await UserStatus.find({});
  const result = {};
  
  for (const status of statuses) {
    const statusObj = await getStatus(status.userId);
    result[status.userId] = {
      ...statusObj,
      location: status.currentLocation || null
    };
  }
  
  return result;
}

// ─── Exports ────────────────────────────────────────
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