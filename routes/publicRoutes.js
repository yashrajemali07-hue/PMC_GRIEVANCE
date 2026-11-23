// routes/publicRoutes.js - Public Stats & Reference Metadata Endpoints
const express = require('express');
const router = express.Router();
const {
  getPublicStats,
  getLeaderboard,
  getMetadata,
} = require('../controllers/publicController');

// High level stats for portal homepage cards
router.get('/stats', getPublicStats);

// Civic points leaderboard
router.get('/leaderboard', getLeaderboard);

// Pune wards, categories, priorities metadata
router.get('/metadata', getMetadata);

module.exports = router;
