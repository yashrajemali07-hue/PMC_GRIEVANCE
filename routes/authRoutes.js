// routes/authRoutes.js - Authentication API Endpoints
const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  citizenLogin,
  adminLogin,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public citizen registration & OTP verification routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Login routes (role-specific + unified backward-compatible endpoint)
router.post('/citizen/login', citizenLogin);
router.post('/admin/login', adminLogin);
router.post('/login', login);

// Protected route for current user profile (Citizen or Admin)
router.get('/me', protect, getMe);
router.get('/profile', protect, getMe); // Alias

module.exports = router;
