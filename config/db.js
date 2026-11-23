// config/db.js - Database connection setup using Mongoose with Serverless Caching
const mongoose = require('mongoose');

// Global cache for serverless environments (Vercel / AWS Lambda)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using the MONGO_URI from environment variables.
 * Implements connection caching across warm serverless function invocations.
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pmc_grievance_portal';

  // Return existing active connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Create new connection promise if not already connecting
  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Prevent unhandled query buffering in serverless
      serverSelectionTimeoutMS: 15000, // 15s timeout for cloud serverless handshakes
      connectTimeoutMS: 15000,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log(`[Database] MongoDB Connected: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    console.error(`[Database Error] Could not connect to MongoDB: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
