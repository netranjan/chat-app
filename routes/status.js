// routes/status.js
const express = require('express');
const router = express.Router();
const https = require('https');
const mongoose = require('mongoose');
const { setTyping, setOnline, setLocation } = require('../services/userStatusStore');

// ---------- Helpers ----------
function getUserId(req) {
  return req.session?.user?.id;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  return raw.replace(/^::ffff:/, '');
}

function isPrivateIp(ip) {
  return /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|::1|fc00:|fe80:)/i.test(ip);
}

function fetchLocationByIp(ip) {
  return new Promise((resolve) => {
    if (!ip || isPrivateIp(ip)) return resolve(null);
    const url = `https://ipwho.is/${ip}`;
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            resolve({
              city: json.city,
              regionName: json.region,
              country: json.country,
              lat: json.latitude,
              lon: json.longitude,
              district: '',
              isp: json.connection?.isp || ''
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// ----- Online status -----
router.post('/online', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ success: false });
  await setOnline(userId, req.body.isOnline);
  res.json({ success: true });
});

// ----- Typing status -----
router.post('/typing', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ success: false });
  await setTyping(userId, req.body.isTyping);
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
    await setLocation(userId, location);
    console.log(`✅ Location stored: ${geoData.city}, ${geoData.regionName}, ${geoData.country}`);
  } else {
    console.warn(`⚠️ Could not fetch location for IP ${clientIp}`);
  }
  res.json({ success: true });
});

// ============================================================
//  /all endpoint – always returns both users
// ============================================================
router.get('/all', async (req, res) => {
  if (req.session?.user?.id !== 1) return res.status(403).json({ error: 'Forbidden' });

  //console.log('🔵 /status/all called');

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
        online = (now - doc.lastHeartbeat.getTime()) < 8_000;
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

  //console.log('📤 Sending:', JSON.stringify(result));
  res.json(result);
});

// ----- Legacy dashboard endpoint -----
router.get('/dashboard', async (req, res) => {
  if (req.session?.user?.id !== 1) return res.status(403).json({ error: 'Forbidden' });

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
        online = (now - doc.lastHeartbeat.getTime()) < 8_000;
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

  const manu = result[2];
  res.json({
    manuOnline: manu.isOnline,
    manuTyping: manu.isTyping,
    manuLocation: manu.location
  });
});

module.exports = router;