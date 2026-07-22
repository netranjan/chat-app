require('dotenv').config();
const express = require('express');
const { configureExpress } = require('../config/express');
const { sessionMiddleware } = require('../config/session');
const { connectDB } = require('../services/database.service');
const pagesRoutes = require('../routes/pages');
const apiRoutes = require('../routes/api');

const app = express();

// Connect to DB, then configure app
const start = async () => {
  await connectDB();
  configureExpress(app);
  app.use(sessionMiddleware);

  app.use('/', pagesRoutes);
  app.use('/', apiRoutes);

  // For local development, listen on a port
  if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }

  return app;
};

// Vercel will await this exported function
module.exports = start();