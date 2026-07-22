const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String,
    city: String,
    state: String,
    country: String,
    district: String,
    isp: String,
    ip: String,
    updatedAt: Date
  },
  isTyping: { type: Boolean, default: false },
  typingTo: { type: Number }, // user id of the person they are typing to (rasuv)
  typingUpdatedAt: { type: Date }
});

module.exports = mongoose.model('User', userSchema);