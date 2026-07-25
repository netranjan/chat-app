// fix-edited.js – Remove false "edited" flags on restored messages
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusfify';

async function fix() {
  console.log('Connecting…');
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.db.collection('messages');

  // Only touch messages that are NOT deleted but still marked edited
  const result = await col.updateMany(
    { deleted: false, edited: true },
    { $set: { edited: false }, $unset: { editedAt: '' } }
  );

  console.log(`✅ Fixed ${result.modifiedCount} message(s).`);
  await mongoose.disconnect();
  console.log('Done.');
}

fix().catch(err => {
  console.error('❌', err);
  process.exit(1);
});