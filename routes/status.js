// routes/status.js
const express = require('express');
const router = express.Router();
const https = require('https');
const mongoose = require('mongoose');                     // <-- new
const { setTyping, setOnline, setLocation } = require('../services/userStatusStore');

// ---------- Helpers ----------
function getUserId(req) {
  return req.session?.user?.id;
}

function getClientIp(req) {
  return req.ip.replace(/^::ffff:/, '');
}

function fetchLocationByIp(ip) {
  return new Promise((resolve, reject) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return resolve(null);
    }
    const url = `https://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,query`;
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') resolve(json);
          else resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => resolve(null));
  });
}

// ----- Online status -----
router.post('/online', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ success: false });
  setOnline(userId, req.body.isOnline);
  console.log(`✅ User ${userId} is now ${req.body.isOnline ? 'online' : 'offline'}`);
  res.json({ success: true });
});

// ----- Typing status -----
router.post('/typing', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ success: false });
  setTyping(userId, req.body.isTyping);
  console.log(`✅ ${req.session.user.username} typing: ${req.body.isTyping}`);
  res.json({ success: true });
});

// ----- Location update -----
router.post('/location', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    console.log('❌ Unauthorized location update');
    return res.status(400).json({ success: false });
  }

  const clientIp = getClientIp(req);
  console.log(`📍 Fetching location for IP: ${clientIp}`);
  const geoData = await fetchLocationByIp(clientIp);

  if (geoData) {
    const location = {
      lat: geoData.lat,
      lng: geoData.lon,
      city: geoData.city,
      state: geoData.regionName,
      country: geoData.country,
      district: geoData.district || '',
      isp: geoData.isp,
      ip: clientIp,
      updatedAt: new Date()
    };
    setLocation(userId, location);
    console.log(`✅ Location stored: ${geoData.city}, ${geoData.regionName}, ${geoData.country}`);
  } else {
    console.warn(`⚠️ Could not fetch location for IP ${clientIp}`);
  }
  res.json({ success: true });
});

// ============================================================
//  🔥 NEW /all endpoint – always returns both users
// ============================================================
router.get('/all', async (req, res) => {
  if (req.session?.user?.id !== 1) return res.status(403).json({ error: 'Forbidden' });

  console.log('🔵 /status/all called');

  // Guaranteed fallback – always returned, even if DB is empty
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
    console.error('❌ /status/all error:', err);
  }

  console.log('📤 Sending:', JSON.stringify(result));
  res.json(result);
});

// ----- Legacy dashboard endpoint (adapted for object) -----
router.get('/dashboard', async (req, res) => {
  if (req.session?.user?.id !== 1) return res.status(403).json({ error: 'Forbidden' });

  // reuse the same logic as /all for consistency
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
    console.error('❌ /dashboard error:', err);
  }

  const manu = result[2];   // user 2 is manu
  res.json({
    manuOnline: manu.isOnline,
    manuTyping: manu.isTyping,
    manuLocation: manu.location
  });
});

module.exports = router;