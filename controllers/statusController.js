const statusService = require('../services/status.service');

exports.updateTyping = async (req, res) => {
  const { isTyping, typingTo } = req.body;
  await statusService.updateTyping(req.session.user.id, isTyping, typingTo);
  res.json({ success: true });
};

exports.updateOnline = async (req, res) => {
  const { isOnline } = req.body;
  await statusService.updateOnlineStatus(req.session.user.id, isOnline);
  res.json({ success: true });
};

exports.updateLocation = async (req, res) => {
  const locationData = req.body; // expects full location object
  await statusService.updateLocation(req.session.user.id, locationData);
  res.json({ success: true });
};

exports.getAllStatuses = async (req, res) => {
  if (req.session.user.id !== 1) return res.status(403).json({ success: false });
  const statuses = await statusService.getAllStatuses();
  res.json(statuses);
};