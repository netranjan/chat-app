// routes/status.js
const express = require('express');
const router = express.Router();
const https = require('https');   // for server‑side IP‑API call

// ---------- In‑memory user status store ----------
const usersStatus = {
  1: { username: 'rasuv', isOnline: false, lastSeen: null, isTyping: false, typingUpdatedAt: null, currentLocation: null },
  2: { username: 'manu', isOnline: false, lastSeen: null, isTyping: false, typingUpdatedAt: null, currentLocation: null }
};

// Helper: get user ID from session
function getUserId(req) {
  return req.session?.user?.id;
}

// Helper: get client IP from request
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.socket.remoteAddress ||
         req.ip;
}

// Helper: server‑side fetch to ip‑api using a client IP
function fetchLocationByIp(ip) {
  return new Promise((resolve, reject) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      // localhost – you can still test by passing a dummy IP or just resolve null
      // For production, you’d want a real IP; we’ll return null gracefully.
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
  if (!userId || !usersStatus[userId]) return res.status(400).json({ success: false });
  usersStatus[userId].isOnline = req.body.isOnline;
  usersStatus[userId].lastSeen = new Date();
  console.log(`✅ ${usersStatus[userId].username} is now ${req.body.isOnline ? 'online' : 'offline'}`);
  res.json({ success: true });
});

// ----- Typing status -----
router.post('/typing', (req, res) => {
  const userId = getUserId(req);
  if (!userId || !usersStatus[userId]) return res.status(400).json({ success: false });
  usersStatus[userId].isTyping = req.body.isTyping;
  usersStatus[userId].typingUpdatedAt = new Date();
  console.log(`✅ ${usersStatus[userId].username} typing: ${req.body.isTyping}`);
  res.json({ success: true });
});

// ----- Location update (client simply POSTs, server does the IP lookup) -----
router.post('/location', async (req, res) => {
  const userId = getUserId(req);
  if (!userId || !usersStatus[userId]) {
    console.log('❌ Unauthorized location update');
    return res.status(400).json({ success: false });
  }

  // Get the client's IP from the request and look it up
  const clientIp = getClientIp(req);
  console.log(`📍 Fetching location for IP: ${clientIp}`);
  const geoData = await fetchLocationByIp(clientIp);

  if (geoData) {
    usersStatus[userId].currentLocation = {
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
    console.log(`✅ Location stored for ${usersStatus[userId].username}: ${geoData.city}, ${geoData.regionName}, ${geoData.country}`);
  } else {
    console.warn(`⚠️ Could not fetch location for IP ${clientIp}`);
  }
  res.json({ success: true });
});

// ----- Get all statuses -----
router.get('/all', (req, res) => {
  const users = Object.values(usersStatus).map(u => ({
    username: u.username,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen,
    isTyping: u.isTyping,
    typingUpdatedAt: u.typingUpdatedAt,
    currentLocation: u.currentLocation
  }));
  res.json(users);
});

// ----- Legacy dashboard endpoint -----
router.get('/dashboard', (req, res) => {
  const manu = usersStatus[2];
  res.json({
    manuOnline: manu.isOnline,
    manuTyping: manu.isTyping,
    manuLocation: manu.currentLocation
  });
});

module.exports = router;