// controllers/authController.js - Authentication Controller
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailUtils');

/**
 * Helper to generate 6-digit random numeric OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Helper to generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'pmc_secure_jwt_secret_key_change_in_production_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @desc    Register a new citizen and send verification OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, ward, phone } = req.body;

    if (!name || !email || !password || !ward) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, ward',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ email: cleanEmail });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const hashedOtp = await bcrypt.hash(otp, salt);

    if (user) {
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email is already registered and verified. Please log in.',
        });
      }
      // Unverified user - update details & issue fresh OTP
      user.name = name.trim();
      user.ward = ward;
      user.passwordHash = passwordHash;
      user.otp = hashedOtp;
      user.otpExpiry = otpExpiry;
      if (phone) user.phone = phone;
      await user.save();
    } else {
      // Create new citizen user
      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        ward,
        phone: phone || '',
        role: 'citizen',
        isVerified: false,
        otp: hashedOtp,
        otpExpiry,
        points: 0,
      });
    }

    // Send OTP using nodemailer
    await sendOtpEmail(cleanEmail, otp);

    const response = {
      success: true,
      message: 'Registration successful! A 6-digit verification OTP has been dispatched to your email address.',
      email: cleanEmail,
      isVerified: false,
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and activate citizen account
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and 6-digit OTP',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with this email',
      });
    }

    if (user.isVerified) {
      const token = generateToken({ id: user._id, role: user.role, email: user.email });
      return res.status(200).json({
        success: true,
        message: 'Account is already verified',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          ward: user.ward,
          role: user.role,
          isVerified: user.isVerified,
          points: user.points,
          civicLevel: user.civicLevel,
        },
      });
    }

    // Check OTP expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
      });
    }

    if (!user.otp) {
      return res.status(400).json({
        success: false,
        message: 'No pending OTP found. Please request a new OTP.',
      });
    }

    // Verify OTP (compare hashed or direct)
    const isMatch = await bcrypt.compare(otp.toString().trim(), user.otp);
    if (!isMatch && user.otp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check and try again.',
      });
    }

    // Mark as verified & clear OTP
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = generateToken({ id: user._id, role: user.role, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        ward: user.ward,
        role: user.role,
        isVerified: user.isVerified,
        points: user.points,
        civicLevel: user.civicLevel,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login for Citizen or Admin (Admin login uses ADMIN_USER and ADMIN_PASS from .env)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, username, phone, password } = req.body;
    const identifier = (email || username || phone || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone/username and password',
      });
    }

    // 1. Check Admin login via ADMIN_USER, ADMIN_PASS, and ADMIN_EMAIL from .env
    const envAdminUser = (process.env.ADMIN_USER || 'admin').trim();
    const envAdminPass = (process.env.ADMIN_PASS || 'adminPMC@2026').trim();
    const envAdminEmail = (process.env.ADMIN_EMAIL || `${envAdminUser}@punecorporation.org`).toLowerCase().trim();

    if (
      (identifier.toLowerCase() === envAdminUser.toLowerCase() ||
        identifier.toLowerCase() === envAdminEmail) &&
      password === envAdminPass
    ) {
      const token = generateToken({
        id: 'admin',
        role: 'admin',
        username: envAdminUser,
        email: envAdminEmail,
      });

      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        token,
        user: {
          id: 'admin',
          name: 'PMC Administrator',
          role: 'admin',
          username: envAdminUser,
          email: envAdminEmail,
        },
      });
    }

    // 2. Citizen / DB User Login (supports email OR mobile number)
    const cleanEmail = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: cleanEmail },
        { phone: identifier },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email/mobile and password.',
      });
    }

    // Compare password with passwordHash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your password.',
      });
    }

    // Ensure citizen is verified
    if (!user.isVerified) {
      // Re-issue a fresh OTP so the user is never stuck
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      const salt = await bcrypt.genSalt(10);
      user.otp = await bcrypt.hash(otp, salt);
      user.otpExpiry = otpExpiry;
      await user.save();

      await sendOtpEmail(cleanEmail, otp);

      const resp = {
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email with the OTP before logging in. A new OTP has been dispatched to your email.',
      };
      return res.status(403).json(resp);
    }

    const token = generateToken({ id: user._id, role: user.role, email: user.email });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        ward: user.ward,
        role: user.role,
        isVerified: user.isVerified,
        points: user.points,
        civicLevel: user.civicLevel,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user details
 * @route   GET /api/auth/me
 * @access  Private (Citizen or Admin)
 */
const getMe = async (req, res, next) => {
  try {
    // If authenticated user is the env admin
    if (req.user && req.user.role === 'admin' && req.user.id === 'admin') {
      return res.status(200).json({
        success: true,
        user: {
          id: 'admin',
          name: req.user.name,
          role: 'admin',
          username: req.user.username,
          email: req.user.email,
        },
      });
    }

    // Return the authenticated citizen user
    const user = await User.findById(req.user._id).select('-passwordHash -otp -otpExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        ward: user.ward,
        role: user.role,
        isVerified: user.isVerified,
        points: user.points,
        civicLevel: user.civicLevel,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register first.',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified. Please log in.',
      });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const salt = await bcrypt.genSalt(10);
    user.otp = await bcrypt.hash(otp, salt);
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOtpEmail(cleanEmail, otp);

    const response = {
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched to your email.',
      email: cleanEmail,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  getMe,
  getProfile: getMe, // Alias for backward compatibility
};
