// controllers/authController.js - Citizen & Admin Authentication Controller
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { PMC_WARDS } = require('../models/constants');
const { sendOtpEmail } = require('../utils/mailUtils');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const OTP_REGEX = /^\d{6}$/;
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

/**
 * Helper to generate cryptographically secure 6-digit numeric OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 1000000).toString();
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
 * Constant-time string comparison using SHA-256 digests
 */
const safeCompareStrings = (a, b) => {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

/**
 * Normalize Indian mobile numbers (e.g. "+91 98220 12345" -> "9822012345")
 */
const normalizePhone = (rawPhone) => {
  if (typeof rawPhone !== 'string') return '';
  let digits = rawPhone.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+91')) {
    digits = digits.slice(3);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

/**
 * Resolve configured environment admin credentials
 */
const getEnvAdminConfig = () => {
  const username = (process.env.ADMIN_USER || 'admin').trim();
  const password = (process.env.ADMIN_PASS || 'adminPMC@2026').trim();
  const email = (process.env.ADMIN_EMAIL || `${username}@punecorporation.org`).toLowerCase().trim();
  return { username, password, email };
};

/**
 * Build consistent sanitized user payload for auth responses
 */
const formatCitizenUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  ward: user.ward,
  role: user.role,
  isVerified: user.isVerified,
  points: user.points,
  civicLevel: user.civicLevel,
});

/**
 * Build consistent admin response payload
 */
const buildEnvAdminAuthResponse = (envAdmin) => {
  const token = generateToken({
    id: 'admin',
    role: 'admin',
    username: envAdmin.username,
    email: envAdmin.email,
  });

  return {
    success: true,
    message: 'Admin login successful',
    token,
    user: {
      id: 'admin',
      name: 'PMC Administrator',
      role: 'admin',
      username: envAdmin.username,
      email: envAdmin.email,
      isVerified: true,
    },
  };
};

/**
 * @desc    Register a new citizen and send verification OTP
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, ward, phone } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof ward !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid text values for name, email, password, and ward',
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanWard = ward.trim();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be between 2 and 100 characters',
      });
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const envAdmin = getEnvAdminConfig();
    if (cleanEmail === envAdmin.email) {
      return res.status(400).json({
        success: false,
        message: 'This email address is reserved for PMC administration',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    if (!PMC_WARDS.includes(cleanWard)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a recognized PMC ward office',
      });
    }

    let cleanPhone = '';
    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Mobile number must be a valid string',
        });
      }
      cleanPhone = normalizePhone(phone);
      if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit Indian mobile number (starting with 6-9)',
        });
      }
    }

    // Check if email already exists
    let user = await User.findOne({ email: cleanEmail });

    // Prevent registering an admin account via citizen registration or duplicate verified phone
    if (user && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts cannot be registered via citizen sign-up',
      });
    }

    if (cleanPhone) {
      const existingPhoneUser = await User.findOne({
        phone: cleanPhone,
        ...(user ? { _id: { $ne: user._id } } : {}),
      });
      if (existingPhoneUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this mobile number is already registered',
        });
      }
    }

    const otp = generateOTP();
    const now = new Date();
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes expiry
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
      user.name = cleanName;
      user.ward = cleanWard;
      user.passwordHash = passwordHash;
      user.otp = hashedOtp;
      user.otpExpiry = otpExpiry;
      user.otpAttempts = 0;
      user.lastOtpSentAt = now;
      user.phone = cleanPhone;
      await user.save();
    } else {
      // Create new citizen user
      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        ward: cleanWard,
        phone: cleanPhone,
        role: 'citizen',
        isVerified: false,
        otp: hashedOtp,
        otpExpiry,
        otpAttempts: 0,
        lastOtpSentAt: now,
        points: 0,
      });
    }

    // Send OTP using nodemailer
    const mailResult = await sendOtpEmail(cleanEmail, otp);
    if (mailResult && mailResult.sent === false) {
      return res.status(503).json({
        success: false,
        message: 'Account saved, but verification email could not be dispatched. Please try resending the OTP.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful! A 6-digit verification OTP has been dispatched to your email address.',
      email: cleanEmail,
      isVerified: false,
    });
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

    if (typeof email !== 'string' || (typeof otp !== 'string' && typeof otp !== 'number')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both a valid email and 6-digit OTP',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    if (!OTP_REGEX.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a valid 6-digit numeric code',
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with this email',
      });
    }

    if (user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'OTP verification is only applicable to citizen accounts',
      });
    }

    if (user.isVerified) {
      const token = generateToken({ id: user._id, role: user.role, email: user.email });
      return res.status(200).json({
        success: true,
        message: 'Account is already verified',
        token,
        user: formatCitizenUser(user),
      });
    }

    // Check OTP existence and expiry
    if (!user.otp || !user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or is missing. Please request a new OTP.',
      });
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Too many invalid OTP attempts. Please request a new verification OTP.',
      });
    }

    // Compare against bcrypt hash (or raw OTP if set directly in legacy/test fixtures)
    const isBcryptHash = /^\$2[aby]\$/.test(user.otp);
    const isMatch = isBcryptHash
      ? await bcrypt.compare(cleanOtp, user.otp)
      : safeCompareStrings(cleanOtp, user.otp);

    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();

      const remaining = Math.max(0, MAX_OTP_ATTEMPTS - user.otpAttempts);
      return res.status(400).json({
        success: false,
        message:
          remaining > 0
            ? `Invalid OTP. You have ${remaining} attempt(s) remaining.`
            : 'Invalid OTP. Maximum attempts reached; please request a new OTP.',
      });
    }

    // Mark as verified & clear OTP state
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await user.save();

    const token = generateToken({ id: user._id, role: user.role, email: user.email });

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      token,
      user: formatCitizenUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Shared login handler supporting strict portal separation ('citizen' | 'admin')
 * as well as backward-compatible unified login when expectedRole is null.
 */
const handleLogin = async (req, res, next, expectedRole = null) => {
  try {
    const { email, username, phone, password, loginType } = req.body;
    const rawIdentifier = email || username || phone;

    if (typeof rawIdentifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid email/phone/username and password',
      });
    }

    const identifier = rawIdentifier.trim();
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/phone/username and password',
      });
    }

    const effectiveRole =
      expectedRole ||
      (loginType === 'admin' || loginType === 'citizen' ? loginType : null);

    const envAdmin = getEnvAdminConfig();
    const matchesEnvAdminIdentifier =
      identifier.toLowerCase() === envAdmin.username.toLowerCase() ||
      identifier.toLowerCase() === envAdmin.email;

    // 1. Validate Admin Portal / Environment Admin credentials
    if (matchesEnvAdminIdentifier) {
      if (effectiveRole === 'citizen') {
        return res.status(403).json({
          success: false,
          message: 'Officer accounts must sign in through the Officer Portal.',
        });
      }

      if (!safeCompareStrings(password, envAdmin.password)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid administrator credentials. Please verify your username and password.',
        });
      }

      return res.status(200).json(buildEnvAdminAuthResponse(envAdmin));
    }

    // 2. Lookup DB User (by email or normalized 10-digit phone)
    const cleanEmail = identifier.toLowerCase();
    const normalizedPhone = normalizePhone(identifier);
    const lookupOr = [{ email: cleanEmail }];
    if (PHONE_REGEX.test(normalizedPhone)) {
      lookupOr.push({ phone: normalizedPhone });
    } else if (identifier) {
      lookupOr.push({ phone: identifier });
    }

    const user = await User.findOne({ $or: lookupOr });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          effectiveRole === 'admin'
            ? 'Invalid administrator credentials.'
            : 'Invalid credentials. Please check your email/mobile and password.',
      });
    }

    // Enforce portal role validation BEFORE password/verification leaks when role is fixed
    if (effectiveRole === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Citizen accounts cannot sign in to the Officer Portal. Please use Citizen Login.',
      });
    }

    if (effectiveRole === 'citizen' && user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'Officer accounts must sign in through the Officer Portal.',
      });
    }

    // Verify password against stored passwordHash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your password.',
      });
    }

    // For citizen accounts, enforce email OTP verification
    if (user.role === 'citizen' && !user.isVerified) {
      const otp = generateOTP();
      const now = new Date();
      const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);
      const salt = await bcrypt.genSalt(10);
      user.otp = await bcrypt.hash(otp, salt);
      user.otpExpiry = otpExpiry;
      user.otpAttempts = 0;
      user.lastOtpSentAt = now;
      await user.save();

      await sendOtpEmail(user.email, otp);

      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email with the OTP before logging in. A new OTP has been dispatched to your email.',
      });
    }

    // Issue JWT token for verified Citizen or DB Admin
    const token = generateToken({ id: user._id, role: user.role, email: user.email });

    return res.status(200).json({
      success: true,
      message:
        user.role === 'admin'
          ? 'Admin login successful'
          : `Welcome back, ${user.name}!`,
      token,
      user: formatCitizenUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login endpoint (unified, supports optional loginType: 'citizen' | 'admin')
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = (req, res, next) => handleLogin(req, res, next, null);

/**
 * @desc    Citizen-only login endpoint (rejects admin credentials)
 * @route   POST /api/auth/citizen/login
 * @access  Public
 */
const citizenLogin = (req, res, next) => handleLogin(req, res, next, 'citizen');

/**
 * @desc    Admin-only login endpoint (rejects citizen credentials)
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
const adminLogin = (req, res, next) => handleLogin(req, res, next, 'admin');

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
          isVerified: true,
        },
      });
    }

    // Return the authenticated citizen or DB admin user
    const user = await User.findById(req.user._id).select('-passwordHash -otp -otpExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        ...formatCitizenUser(user),
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
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email. Please register first.',
      });
    }

    if (user.role !== 'citizen') {
      return res.status(403).json({
        success: false,
        message: 'OTP verification is only applicable to citizen accounts',
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already verified. Please log in.',
      });
    }

    if (user.lastOtpSentAt && Date.now() - new Date(user.lastOtpSentAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - (Date.now() - new Date(user.lastOtpSentAt).getTime())) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} second(s) before requesting a new OTP.`,
        retryAfterSeconds: waitSeconds,
      });
    }

    const otp = generateOTP();
    const now = new Date();
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);
    const salt = await bcrypt.genSalt(10);
    user.otp = await bcrypt.hash(otp, salt);
    user.otpExpiry = otpExpiry;
    user.otpAttempts = 0;
    user.lastOtpSentAt = now;
    await user.save();

    const mailResult = await sendOtpEmail(cleanEmail, otp);
    if (mailResult && mailResult.sent === false) {
      return res.status(503).json({
        success: false,
        message: 'Failed to dispatch OTP email. Please try again shortly.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched to your email.',
      email: cleanEmail,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  citizenLogin,
  adminLogin,
  getMe,
  getProfile: getMe, // Alias for backward compatibility
};
