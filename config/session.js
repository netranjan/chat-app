const session = require('express-session');
const MongoStore = require('connect-mongo');

// 1. Create the store (compatible with v6 and above)
let store;
try {
  // Newer versions export a class – use 'new' directly
  store = new MongoStore({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60,
    touchAfter: 24 * 3600
  });
} catch {
  // Fallback for older versions that used .create()
  store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60,
    touchAfter: 24 * 3600
  });
}

// 2. Silently ignore expired‑session touch errors
store.on('error', (error) => {
  if (error.message && error.message.includes('Unable to find the session to touch')) {
    return;
  }
  console.error('Session store error:', error.message);
});

// 3. Create the session middleware
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
});

module.exports = { sessionMiddleware };