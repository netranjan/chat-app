const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Setting = require('../models/Setting');
const { USERS } = require('../config/constants');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
  // Seed users if not exist
  for (const [username, data] of Object.entries(USERS)) {
    const user = await User.findOne({ username });
    if (!user) {
      await User.create({ id: data.id, username: data.username, password: data.password });
    }
  }
}

// Counter for message ids
async function getNextMessageId() {
  const setting = await Setting.findOneAndUpdate(
    { key: 'messageCounter' },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return setting.value;
}

module.exports = { connectDB, getNextMessageId };