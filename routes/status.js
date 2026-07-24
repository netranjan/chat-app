// routes/status.js
const express = require('express');
const router = express.Router();
const https = require('https');
const {
  setTyping,
  setOnline,
  setLocation,
  getAllStatuses
} = require('../services/userStatusStore');

// ---------- Helpers ----------
function getUserId(req) {
  return req.session?.user?.id;
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.socket.remoteAddress ||
         req.ip;
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

// ----- Get all statuses (for dashboard) -----
router.get('/all', (req, res) => {
  res.json(getAllStatuses());
});

// ----- Legacy dashboard endpoint -----
router.get('/dashboard', (req, res) => {
  const statuses = getAllStatuses();
  const manu = statuses.find(s => s.username === 'manu') || {};
  res.json({
    manuOnline: manu.isOnline,
    manuTyping: manu.isTyping,
    manuLocation: manu.currentLocation
  });
});

module.exports = router;