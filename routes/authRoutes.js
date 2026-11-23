// routes/authRoutes.js - Authentication API Endpoints
const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);

// Protected route for current user profile
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe); // Alias

module.exports = router;
