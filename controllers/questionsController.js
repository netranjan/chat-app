const Question = require('../models/Question');  // assuming you have a Question model

exports.getRandomQuestions = async (req, res) => {
  const count = parseInt(req.query.count) || 10;
  try {
    const questions = await Question.aggregate([{ $sample: { size: count } }]);
    res.json({ success: true, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};