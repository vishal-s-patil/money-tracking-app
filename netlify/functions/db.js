const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri);
  await client.connect();
  
  // Use 'moneytracker' as database name
  const db = client.db('moneytracker');

  cachedClient = client;
  cachedDb = db;

  console.log('Connected to MongoDB successfully');

  return { client, db };
}

module.exports = { connectToDatabase };

