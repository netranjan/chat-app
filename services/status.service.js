// services/status.service.js
const {
  setTyping,
  setOnline,
  setLocation,
  getAllStatuses
} = require('./userStatusStore');

exports.updateTyping = async (userId, isTyping, typingTo) => {
  setTyping(userId, isTyping);
};

exports.updateOnlineStatus = async (userId, isOnline) => {
  setOnline(userId, isOnline);
};

exports.updateLocation = async (userId, locationData) => {
  setLocation(userId, locationData);
};

exports.getAllStatuses = async () => {
  return getAllStatuses();  // already returns an array
};