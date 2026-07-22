const Content = require('../models/Content');

exports.getContentByType = async (req, res) => {
  const { type } = req.query;
  if (!type) {
    return res.status(400).json({ success: false, message: 'Type query parameter is required.' });
  }
  try {
    const items = await Content.find({ type }, 'data -_id');
    res.json({
      success: true,
      data: items.map(i => i.data)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};