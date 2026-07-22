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

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
  });

  return app;
}

// Local development: start listening on a port
if (process.env.NODE_ENV !== 'production') {
  initialize().then((expressApp) => {
    const PORT = process.env.PORT || 3000;
    expressApp.listen(PORT, () => {
      console.log(`Local server running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

// Vercel: export a handler function
module.exports = async (req, res) => {
  const expressApp = await initialize();
  return expressApp(req, res);
};