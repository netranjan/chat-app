const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['curiosity', 'fact', 'quote', 'association', 'guessWord', 'highlight']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,   // stores the whole object (e.g., { fact, icon, source })
    required: true
  }
});

// Index for fast queries by type
contentSchema.index({ type: 1 });

module.exports = mongoose.model('Content', contentSchema);