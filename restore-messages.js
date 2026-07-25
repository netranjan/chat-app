// restore-messages.js – Restore all soft-deleted messages
require('dotenv').config();                        // loads MONGODB_URI from .env if present
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusfify';

async function restore() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // Access the messages collection directly (Mongoose pluralises the model name)
  const col = mongoose.connection.db.collection('messages');

  const result = await col.updateMany(
    { deleted: true },
    { $set: { deleted: false } }
  );

  console.log(`✅ Restored ${result.modifiedCount} message(s).`);
  await mongoose.disconnect();
  console.log('Done.');
}

restore().catch(err => {
  console.error('❌', err);
  process.exit(1);
});