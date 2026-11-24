// config/db.js - Database connection setup using Mongoose with Serverless & Local In-Memory Fallback
const mongoose = require('mongoose');

// Global cache for connection & in-memory server
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using MONGO_URI, or fall back to an embedded in-memory MongoDB
 * if local mongod is not running.
 */
const connectDB = async () => {
  // Return existing active connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (cached.promise) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (_) {
      cached.promise = null;
    }
  }

  let configuredUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pmc_grievance_portal';
  if (configuredUri.startsWith('mongodb+srv://') && configuredUri.endsWith('/')) {
    configuredUri += 'pmc_grievance_portal?retryWrites=true&w=majority';
  }
  const isLocalHost = configuredUri.includes('localhost') || configuredUri.includes('127.0.0.1');

  // Helper function to connect mongoose
  const connectWithMongoose = async (uri, timeoutMs = 15000) => {
    return await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs,
    });
  };

  cached.promise = (async () => {
    // Vercel Serverless Environment
    if (process.env.VERCEL) {
      if (!process.env.MONGO_URI) {
        throw new Error(
          'Missing MONGO_URI in Vercel Environment Variables. Please add MONGO_URI in Vercel Settings -> Environment Variables.'
        );
      }
      if (configuredUri.includes('<db_password>') || configuredUri.includes('<password>')) {
        throw new Error(
          'Placeholder <db_password> found in Vercel MONGO_URI. Please update with your actual MongoDB Atlas password.'
        );
      }
      try {
        const conn = await connectWithMongoose(configuredUri, 10000);
        console.log(`[Vercel DB] Connected to MongoDB Atlas: ${conn.connection.host}/${conn.connection.name}`);

        // Auto-seed default sample data if remote database is empty
        try {
          const User = require('../models/User');
          const userCount = await User.countDocuments();
          if (userCount === 0) {
            const seedDatabase = require('../seed');
            await seedDatabase(false);
          }
        } catch (_) {}

        return conn;
      } catch (err) {
        throw new Error(
          `MongoDB Atlas connection failed: ${err.message}. Make sure Network Access in MongoDB Atlas has 0.0.0.0/0 (Allow access from anywhere) enabled.`
        );
      }
    }

    // Local / Non-Vercel Environment
    // 1. If not localhost (e.g. MongoDB Atlas cluster)
    if (!isLocalHost) {
      if (configuredUri.includes('<db_password>') || configuredUri.includes('<password>')) {
        console.warn('----------------------------------------------------');
        console.warn('[Database Notice] Placeholder <db_password> found in MONGO_URI.');
        console.warn('[Database Notice] Please update your actual password in .env.');
        console.warn('[Database Notice] Falling back to embedded In-Memory MongoDB for local testing.');
        console.warn('----------------------------------------------------');
      } else {
        try {
          const conn = await connectWithMongoose(configuredUri, 15000);
          console.log(`[Database] MongoDB Connected to remote Atlas: ${conn.connection.host}/${conn.connection.name}`);

          // Auto-seed default sample data if remote database is empty
          try {
            const User = require('../models/User');
            const userCount = await User.countDocuments();
            if (userCount === 0) {
              console.log('[Database] Remote database is empty. Initializing with default seed data...');
              const seedDatabase = require('../seed');
              await seedDatabase(false);
              console.log('[Database] Initial seed data loaded successfully into remote database.');
            }
          } catch (seedErr) {
            console.warn('[Database] Remote auto-seeding check skipped:', seedErr.message);
          }

          return conn;
        } catch (atlasErr) {
          console.error('----------------------------------------------------');
          console.error(`[Database Atlas Error] Could not connect to remote MongoDB Atlas: ${atlasErr.message}`);
          console.error('[Database Atlas Error] Tip: Ensure your current IP is whitelisted (Network Access: 0.0.0.0/0) in Atlas.');
          console.error('[Database Atlas Error] Falling back to embedded In-Memory MongoDB so portal remains functional.');
          console.error('----------------------------------------------------');
        }
      }
    }

    // 2. Localhost URI: Test if local mongod is active with a short timeout
    try {
      const conn = await connectWithMongoose(configuredUri, 1500);
      console.log(`[Database] Local MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (localErr) {
      console.log('[Database] Local mongod daemon not detected. Starting embedded In-Memory MongoDB...');
    }

    // 3. Fallback to embedded mongodb-memory-server
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      if (!global.__mongoMemoryServer) {
        global.__mongoMemoryServer = await MongoMemoryServer.create();
      }
      const memUri = global.__mongoMemoryServer.getUri() + 'pmc_grievance_portal';
      process.env.MONGO_URI = memUri;

      const conn = await connectWithMongoose(memUri, 10000);
      console.log(`[Database] Embedded In-Memory MongoDB Connected at: ${conn.connection.host}/${conn.connection.name}`);

      // Auto-seed default sample data if empty
      try {
        const User = require('../models/User');
        const userCount = await User.countDocuments();
        if (userCount === 0) {
          console.log('[Database] Initializing empty database with default seed data...');
          const seedDatabase = require('../seed');
          await seedDatabase(false);
          console.log('[Database] Initial seed data loaded successfully.');
        }
      } catch (seedErr) {
        console.warn('[Database] Auto-seeding skipped or encountered error:', seedErr.message);
      }

      return conn;
    } catch (memErr) {
      console.error('[Database Error] Failed to start embedded In-Memory MongoDB:', memErr.message);
      throw memErr;
    }
  })();

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
