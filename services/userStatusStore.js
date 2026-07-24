// services/userStatusStore.js
// In‑memory store shared across the whole application
const usersStatus = {
  1: { username: 'rasuv', isOnline: false, lastSeen: null, isTyping: false, typingUpdatedAt: null, currentLocation: null },
  2: { username: 'manu', isOnline: false, lastSeen: null, isTyping: false, typingUpdatedAt: null, currentLocation: null }
};

function getStatus(userId) {
  return usersStatus[userId] || null;
}

function setTyping(userId, isTyping) {
  if (usersStatus[userId]) {
    usersStatus[userId].isTyping = isTyping;
    usersStatus[userId].typingUpdatedAt = isTyping ? new Date() : usersStatus[userId].typingUpdatedAt;
  }
}

function setOnline(userId, isOnline) {
  if (usersStatus[userId]) {
    usersStatus[userId].isOnline = isOnline;
    usersStatus[userId].lastSeen = new Date();
  }
}

function setLocation(userId, locationData) {
  if (usersStatus[userId]) {
    usersStatus[userId].currentLocation = locationData;
  }
}

function getAllStatuses() {
  return Object.values(usersStatus).map(u => ({
    username: u.username,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen,
    isTyping: u.isTyping,
    typingUpdatedAt: u.typingUpdatedAt,
    currentLocation: u.currentLocation
  }));
}

module.exports = { getStatus, setTyping, setOnline, setLocation, getAllStatuses };