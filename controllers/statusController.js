// controllers/statusController.js
const mongoose = require('mongoose');
const { setTyping, setOnline, setLocation } = require('../services/userStatusStore');

exports.updateTyping = async (req, res) => {
  await setTyping(req.session.user.id, req.body.isTyping);
  res.json({ success: true });
};

exports.updateOnline = async (req, res) => {
  await setOnline(req.session.user.id, req.body.isOnline);
  res.json({ success: true });
};

exports.updateLocation = async (req, res) => {
  await setLocation(req.session.user.id, req.body);
  res.json({ success: true });
};

exports.getAllStatuses = async (req, res) => {
  console.log('🔵 getAllStatuses called – returning guaranteed object');

  // ALWAYS present – even if the database is empty or throws an error
  const result = {
    1: {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null,
      location: null
    },
    2: {
      isOnline: false,
      lastSeen: new Date(0).toISOString(),
      isTyping: false,
      typingUpdatedAt: null,
      location: null
    }
  };

  try {
    const col = mongoose.connection.db.collection('userstatuses');
    const docs = await col.find({}).toArray();
    const now = Date.now();

    for (const doc of docs) {
      const userId = doc.userId;
      if (!result[userId]) continue;

      let online = false;
      if (doc.lastHeartbeat && doc.lastHeartbeat.getTime() > 0) {
        online = (now - doc.lastHeartbeat.getTime()) < 15_000;
      }

      let typing = false;
      let typingAt = null;
      if (doc.isTyping && doc.typingStarted) {
        if ((now - doc.typingStarted.getTime()) < 5_000) {
          typing = true;
          typingAt = doc.typingStarted.toISOString();
        }
      }

      result[userId] = {
        isOnline: online,
        lastSeen: doc.lastOnlineTime ? doc.lastOnlineTime.toISOString() : new Date(0).toISOString(),
        isTyping: typing,
        typingUpdatedAt: typingAt,
        location: doc.currentLocation || null
      };
    }
  } catch (err) {
    console.error('❌ getAllStatuses DB error:', err);
  }

  console.log('📤 Sending result:', JSON.stringify(result));
  res.json(result);
};