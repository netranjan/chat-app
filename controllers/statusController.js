const {
  setTyping,
  setOnline,
  setLocation,
  getAllStatuses
} = require('../services/userStatusStore');

exports.updateTyping = async (req, res) => {
  const { isTyping, typingTo } = req.body;
  await setTyping(req.session.user.id, isTyping);
  res.json({ success: true });
};

exports.updateOnline = async (req, res) => {
  const { isOnline } = req.body;
  await setOnline(req.session.user.id, isOnline);
  res.json({ success: true });
};

exports.updateLocation = async (req, res) => {
  const locationData = req.body;
  await setLocation(req.session.user.id, locationData);
  res.json({ success: true });
};

exports.getAllStatuses = async (req, res) => {
  if (req.session.user.id !== 1) return res.status(403).json({ success: false });
  const statuses = await getAllStatuses();
  res.json(statuses);
};