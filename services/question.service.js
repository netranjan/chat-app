const Question = require('../models/Question');

// Insert an array of questions (skip duplicates based on 'q' field)
async function seedQuestions(questionsArray) {
  for (const q of questionsArray) {
    // Avoid inserting the same question twice
    const exists = await Question.findOne({ q: q.q });
    if (!exists) {
      await Question.create(q);
    }
  }
  console.log(`✅ Seeded ${questionsArray.length} questions.`);
}

// Get random questions (count defaults to 10)
async function getRandomQuestions(count = 10) {
  return Question.aggregate([{ $sample: { size: count } }]);
}

module.exports = { seedQuestions, getRandomQuestions };