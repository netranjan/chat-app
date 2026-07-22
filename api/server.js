require('dotenv').config();
const express = require('express');
const { configureExpress } = require('../config/express');
const { sessionMiddleware } = require('../config/session');
const { connectDB } = require('../services/database.service');
const pagesRoutes = require('../routes/pages');
const apiRoutes = require('../routes/api');

let app;

async function initialize() {
  if (app) return app;

  app = express();

  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('MongoDB connected.');

  configureExpress(app);
  app.use(sessionMiddleware);

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

// ---- Start the server if this file is run directly (local dev or Render) ----
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

// ---- Export for Vercel (serverless) ----
module.exports = async (req, res) => {
  const expressApp = await initialize();
  return expressApp(req, res);
};