// services/userStatusStore.js
const mongoose = require('mongoose');

const ONLINE_TIMEOUT_MS = 8_000;
const TYPING_EXPIRE_MS  = 5_000;
const typingTimers = new Map();

function col() {
  return mongoose.connection.db.collection('userstatuses');
}

// ─── Heartbeat ───────────────────────────────────────
async function touchActivity(userId) {
  const now = new Date();
  await col().updateOne(
    { userId },
    { $set: { lastHeartbeat: now, lastOnlineTime: now, isOnline: true } },
    { upsert: true }
  );
}

// ─── Online ──────────────────────────────────────────
async function setOnline(userId, isOnline) {
  if (isOnline) return touchActivity(userId);
  await col().updateOne(
    { userId },
    { $set: { lastHeartbeat: new Date(0), lastOnlineTime: new Date(), isOnline: false } },
    { upsert: true }
  );
}

// ─── Typing ──────────────────────────────────────────
async function setTyping(userId, isTyping) {
  if (typingTimers.has(userId)) {
    clearTimeout(typingTimers.get(userId));
    typingTimers.delete(userId);
  }

  if (isTyping) {
    const now = new Date();
    await col().updateOne(
      { userId },
      { $set: { isTyping: true, typingStarted: now } },
      { upsert: true }
    );
    const timer = setTimeout(async () => {
      try {
        await col().updateOne({ userId }, { $set: { isTyping: false, typingStarted: null } });
      } catch (e) {}
      typingTimers.delete(userId);
    }, TYPING_EXPIRE_MS);
    typingTimers.set(userId, timer);
  } else {
    await col().updateOne(
      { userId },
      { $set: { isTyping: false, typingStarted: null } },
      { upsert: true }
    );
  }
}

async function clearTyping(userId) {
  await setTyping(userId, false);
}

// ─── getStatus (used by poll controller) ──────────────
async function getStatus(userId) {
  const doc = await col().findOne({ userId });
  if (!doc) {
    return { isOnline: false, lastSeen: new Date(0).toISOString(), isTyping: false, typingUpdatedAt: null };
  }

  const now = Date.now();
  let isOnline = false;
  if (doc.lastHeartbeat && doc.lastHeartbeat.getTime() > 0) {
    isOnline = (now - doc.lastHeartbeat.getTime()) < ONLINE_TIMEOUT_MS;
  }

  let isTyping = false;
  let typingUpdatedAt = null;
  if (doc.isTyping && doc.typingStarted) {
    if ((now - doc.typingStarted.getTime()) < TYPING_EXPIRE_MS) {
      isTyping = true;
      typingUpdatedAt = doc.typingStarted.toISOString();
    }
  }

  return {
    isOnline,
    lastSeen: doc.lastOnlineTime ? doc.lastOnlineTime.toISOString() : new Date(0).toISOString(),
    isTyping,
    typingUpdatedAt
  };
}

// ─── Location ────────────────────────────────────────
async function setLocation(userId, locationData) {
  await col().updateOne({ userId }, { $set: { currentLocation: locationData } }, { upsert: true });
}

// ─── getAllStatuses – always returns both users ─────
async function getAllStatuses() {
  // Start with guaranteed fallback
  const result = {
    1: { isOnline: false, lastSeen: new Date(0).toISOString(), isTyping: false, typingUpdatedAt: null, location: null },
    2: { isOnline: false, lastSeen: new Date(0).toISOString(), isTyping: false, typingUpdatedAt: null, location: null }
  };

  try {
    const docs = await col().find({}).toArray();
    const now = Date.now();
    for (const doc of docs) {
      const userId = doc.userId;
      if (!result[userId]) continue;   // only care about 1 and 2

      let isOnline = false;
      if (doc.lastHeartbeat && doc.lastHeartbeat.getTime() > 0) {
        isOnline = (now - doc.lastHeartbeat.getTime()) < ONLINE_TIMEOUT_MS;
      }

      let isTyping = false;
      let typingUpdatedAt = null;
      if (doc.isTyping && doc.typingStarted) {
        if ((now - doc.typingStarted.getTime()) < TYPING_EXPIRE_MS) {
          isTyping = true;
          typingUpdatedAt = doc.typingStarted.toISOString();
        }
      }

      result[userId] = {
        isOnline,
        lastSeen: doc.lastOnlineTime ? doc.lastOnlineTime.toISOString() : new Date(0).toISOString(),
        isTyping,
        typingUpdatedAt,
        location: doc.currentLocation || null
      };
    }
  } catch (err) {
    console.error('getAllStatuses error:', err);
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
  getStatus
};