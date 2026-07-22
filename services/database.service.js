const mongoose = require('mongoose');
const User = require('../models/User');
const Setting = require('../models/Setting');
const { USERS } = require('../config/constants');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');

    // Ensure message counter exists
    await Setting.findOneAndUpdate(
      { key: 'messageCounter' },
      { $setOnInsert: { value: 0 } },
      { upsert: true, new: true }
    );

    // Seed users if not exist
    for (const [username, data] of Object.entries(USERS)) {
      const user = await User.findOne({ username });
      if (!user) {
        await User.create({ id: data.id, username: data.username, password: data.password });
        console.log(`Created user: ${username}`);
      }
    }
  } catch (err) {
    console.error('Database initialisation failed:', err);
    process.exit(1);   // Exit if DB can't connect – prevents running without a DB
  }
}

async function getNextMessageId() {
  const setting = await Setting.findOneAndUpdate(
    { key: 'messageCounter' },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return setting.value;
}

module.exports = { connectDB, getNextMessageId };