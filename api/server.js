require('dotenv').config();
const express = require('express');
const { configureExpress } = require('../config/express');
const { sessionMiddleware } = require('../config/session');
const { connectDB } = require('../services/database.service');
const { touchActivity } = require('../services/userStatusStore');  // ← new import
const pagesRoutes = require('../routes/pages');
const apiRoutes = require('../routes/api');

let app;

async function initialize() {
  if (app) return app;

  app = express();

  app.set('trust proxy', 1);
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('MongoDB connected.');

  configureExpress(app);
  app.use(sessionMiddleware);

  // ======== NEW: touch activity on every authenticated request ========
  app.use((req, res, next) => {
    if (req.session && req.session.user && req.session.user.id) {
      touchActivity(req.session.user.id);
    }
    next();
  });
  // ===================================================================

  app.use('/', pagesRoutes);
  app.use('/', apiRoutes);

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message || err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal Server Error' });
  });
  return app;
}

if (require.main === module) {
  initialize()
    .then((expressApp) => {
      const PORT = process.env.PORT || 3000;
      expressApp.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
}

module.exports = async (req, res) => {
  const expressApp = await initialize();
  return expressApp(req, res);
};