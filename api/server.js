require('dotenv').config();
const express = require('express');
const { configureExpress } = require('../config/express');
const { sessionMiddleware } = require('../config/session');
const { connectDB } = require('../services/database.service');
const pagesRoutes = require('../routes/pages');
const apiRoutes = require('../routes/api');

let app;

// Create the Express app once and export it as a handler
async function initialize() {
  // Only initialise once
  if (app) return app;

  app = express();

  // Connect to MongoDB
  await connectDB();

  // Configure Express
  configureExpress(app);
  app.use(sessionMiddleware);

  // Routes
  app.use('/', pagesRoutes);
  app.use('/', apiRoutes);

  return app;
}

// Vercel expects an async function that returns the app
module.exports = async (req, res) => {
  const expressApp = await initialize();
  return expressApp(req, res);
};