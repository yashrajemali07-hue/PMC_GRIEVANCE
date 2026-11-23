// server.js - Pune Municipal Corporation (PMC) Citizen Grievance Portal Backend
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
const connectDB = require('./config/db.js');
if (!process.env.VERCEL) {
  connectDB().catch((err) => {
    console.error('[PMC Portal] Initial database connection error:', err.message);
  });
}

// Initialize Express Application
const app = express();

// ==========================================
// Middleware Configuration
// ==========================================

// Enable Cross-Origin Resource Sharing (CORS)
app.use(cors());

// Body Parsers for incoming JSON and Form Data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless Database Connection Middleware
// Ensures MongoDB connection is established before processing API routes
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await connectDB();
    } catch (err) {
      console.error('[Serverless DB Error]', err.message);
      return res.status(503).json({
        success: false,
        message: 'Database connection failed. Please verify MONGO_URI in Vercel Environment Variables.',
        error: err.message,
      });
    }
  }
  next();
});

// Serve static files from the /public directory and /uploads directory
if (process.env.VERCEL) {
  app.use('/uploads', express.static(path.join('/tmp', 'uploads')));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ==========================================
// Health Check Route (Required by Specification)
// ==========================================
/**
 * @route   GET /api/health
 * @desc    Check system health and database connectivity
 * @access  Public
 */
app.get('/api/health', async (req, res) => {
  let dbError = null;
  try {
    await connectDB();
  } catch (err) {
    dbError = err.message;
  }

  const isConnected = mongoose.connection.readyState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? 'ok' : 'degraded',
    service: 'PMC Citizen Grievance Portal Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    serverless: !!process.env.VERCEL,
    database: {
      status: isConnected ? 'connected' : 'disconnected',
      connected: isConnected,
      hasMongoUri: !!process.env.MONGO_URI,
      error: dbError,
    },
    uptime: process.uptime(),
  });
});

// ==========================================
// API Routes
// ==========================================
const authRoutes = require('./routes/authRoutes');
const grievanceRoutes = require('./routes/grievanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/complaints', grievanceRoutes); // Alias for convenience
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);

// ==========================================
// Error Handling Middleware
// ==========================================
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Handle 404 for undefined routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

// Export Express app (Required for Vercel Serverless environment)
module.exports = app;

// ==========================================
// Start Server (Only in local / standalone mode)
// ==========================================
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`[PMC Portal] Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`[PMC Portal] Listening at: http://localhost:${PORT}`);
    console.log(`[PMC Portal] Health check: http://localhost:${PORT}/api/health`);
    console.log(`[PMC Portal] Public web:   http://localhost:${PORT}`);
    console.log('====================================================');
  });

  // Handle server errors gracefully
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[PMC Portal Error] Port ${PORT} is already in use by another process.`);
      console.error(`[PMC Portal Error] Please free port ${PORT} or set a different PORT in .env`);
      process.exit(1);
    } else {
      console.error('\n[PMC Portal Error] Server encountered an unexpected error:', err.message);
      process.exit(1);
    }
  });

  // Graceful shutdown handling for nodemon restarts and termination signals
  const gracefulShutdown = (signal) => {
    server.close(async () => {
      try {
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
        }
      } catch (_) {}
      process.exit(0);
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGUSR2', () => {
    server.close(() => {
      process.kill(process.pid, 'SIGUSR2');
    });
  });
}
