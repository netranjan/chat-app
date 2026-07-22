const express = require('express');
const { configureExpress } = require('../config/express');
const { sessionMiddleware } = require('../config/session');
const { connectDB } = require('../services/database.service');
const pagesRoutes = require('../routes/pages');
const apiRoutes = require('../routes/api');

let app;

async function initialize() {
  if (app) return app;

  console.log('Initialising app...');

  try {
    await connectDB();
    console.log('MongoDB connected.');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    throw err; // will be caught by the handler
  }

  app = express();
  configureExpress(app);
  app.use(sessionMiddleware);

  app.use('/', pagesRoutes);
  app.use('/', apiRoutes);

  // Global error handler (catch anything that slips through)
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).send('Internal Server Error');
  });

  console.log('App initialised.');
  return app;
}

// Vercel handler
module.exports = async (req, res) => {
  try {
    const expressApp = await initialize();
    return expressApp(req, res);
  } catch (err) {
    // If initialisation fails, log the error and return a 500
    console.error('Fatal initialisation error:', err);
    res.status(500).json({
      error: 'Server initialisation failed',
      message: err.message || 'Unknown error'
    });
  }
};