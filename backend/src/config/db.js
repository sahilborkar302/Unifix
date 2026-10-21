const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
    const where = env.mongoUri.startsWith('mongodb+srv') ? 'MongoDB Atlas' : 'MongoDB (local)';
    console.log(`[UNIFIX] Connected to ${where} -> db "${mongoose.connection.name}"`);
  } catch (err) {
    console.error('\n[UNIFIX] Could not connect to MongoDB.');
    console.error(`         URI: ${env.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
    console.error('         -> Start MongoDB (local service / Compass) or fix MONGODB_URI in backend/.env');
    console.error(`         Reason: ${err.message}\n`);
    process.exit(1);
  }
}

module.exports = connectDB;
