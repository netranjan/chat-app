// models/UserStatus.js
const mongoose = require('mongoose');

const userStatusSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  lastHeartbeat: {
    type: Date,
    default: null
  },
  lastOnlineTime: {
    type: Date,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isTyping: {
    type: Boolean,
    default: false
  },
  typingStarted: {
    type: Date,
    default: null
  },
  typingTo: {
    type: Number,
    default: null
  },
  currentLocation: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, { timestamps: true });

// Seed both users – called from server.js AFTER DB connection
userStatusSchema.statics.seed = async function () {
  const UserStatus = this;
  const existing1 = await UserStatus.findOne({ userId: 1 });
  const existing2 = await UserStatus.findOne({ userId: 2 });
  if (!existing1) await UserStatus.create({ userId: 1 });
  if (!existing2) await UserStatus.create({ userId: 2 });
};

const UserStatus = mongoose.model('UserStatus', userStatusSchema);
module.exports = UserStatus;