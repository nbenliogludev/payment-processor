const mongoose = require('mongoose');

const env = require('./env');

async function connectMongo() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
}

async function disconnectMongo() {
  await mongoose.disconnect();
}

module.exports = {
  connectMongo,
  disconnectMongo,
};
