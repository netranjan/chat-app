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

// Auto‑seed users 1 (rasuv) and 2 (manu) on first run
userStatusSchema.statics.seed = async function () {
  const UserStatus = this;
  const existing1 = await UserStatus.findOne({ userId: 1 });
  const existing2 = await UserStatus.findOne({ userId: 2 });
  if (!existing1) await UserStatus.create({ userId: 1 });
  if (!existing2) await UserStatus.create({ userId: 2 });
};

const UserStatus = mongoose.model('UserStatus', userStatusSchema);

// Run seeding when the model is first loaded
UserStatus.seed().catch(err => {
  console.error('UserStatus seeding failed:', err.message);
});

module.exports = UserStatus;