const User = require('../models/User');

async function updateOnlineStatus(userId, isOnline) {
  await User.findOneAndUpdate({ id: userId }, { isOnline, lastSeen: new Date() });
}

async function updateTyping(userId, isTyping, typingTo) {
  await User.findOneAndUpdate({ id: userId }, { isTyping, typingTo, typingUpdatedAt: new Date() });
}

async function updateLocation(userId, locationData) {
  await User.findOneAndUpdate({ id: userId }, {
    currentLocation: { ...locationData, updatedAt: new Date() }
  });
}

async function getAllStatuses() {
  const users = await User.find({}, 'id username isOnline lastSeen isTyping typingUpdatedAt currentLocation');
  // Map to plain objects, exclude sensitive info
  return users.map(u => ({
    id: u.id,
    username: u.username,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen,
    isTyping: u.isTyping,
    typingUpdatedAt: u.typingUpdatedAt,
    currentLocation: u.currentLocation
  }));
}

module.exports = { updateOnlineStatus, updateTyping, updateLocation, getAllStatuses };