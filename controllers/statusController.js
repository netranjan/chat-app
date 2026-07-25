// controllers/statusController.js
const mongoose = require('mongoose');
const {
  setTyping,
  setOnline,
  setLocation
} = require('../services/userStatusStore');

const ONLINE_TIMEOUT_MS = 15_000;
const TYPING_EXPIRE_MS = 5_000;

exports.updateTyping = async (req, res) => {
  const { isTyping } = req.body;
  await setTyping(req.session.user.id, isTyping);
  res.json({ success: true });
};

exports.updateOnline = async (req, res) => {
  const { isOnline } = req.body;
  await setOnline(req.session.user.id, isOnline);
  res.json({ success: true });
};

exports.updateLocation = async (req, res) => {
  await setLocation(req.session.user.id, req.body);
  res.json({ success: true });
};

exports.getAllStatuses = async (req, res) => {
  if (req.session.user.id !== 1) return res.status(403).json({ success: false });

  // Start with a guaranteed fallback – always returns both users
  const result = {
    1: { isOnline: false, lastSeen: new Date(0).toISOString(), isTyping: false, typingUpdatedAt: null, location: null },
    2: { isOnline: false, lastSeen: new Date(0).toISOString(), isTyping: false, typingUpdatedAt: null, location: null }
  };

  try {
    const col = mongoose.connection.db.collection('userstatuses');
    const docs = await col.find({}).toArray();
    const now = Date.now();

    for (const doc of docs) {
      const userId = doc.userId;
      if (!result[userId]) continue;   // only care about users 1 and 2

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
    // fallback already set, nothing more to do
  }

  res.json(result);
};