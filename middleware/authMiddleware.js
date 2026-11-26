// middleware/authMiddleware.js - JWT Authentication & Role Authorization
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('[AuthMiddleware Warning] JWT_SECRET is not set in production environment!');
  }
  return process.env.JWT_SECRET || 'pmc_secure_jwt_secret_key_change_in_production_2026';
};

const extractBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token || null;
};

const buildEnvAdminUser = () => {
  const envAdminUser = (process.env.ADMIN_USER || 'admin').trim();
  const envAdminEmail = (process.env.ADMIN_EMAIL || `${envAdminUser}@punecorporation.org`)
    .toLowerCase()
    .trim();

  return {
    _id: 'admin',
    id: 'admin',
    name: 'PMC Administrator',
    role: 'admin',
    username: envAdminUser,
    email: envAdminEmail,
    isVerified: true,
  };
};

/**
 * Resolve and validate the authenticated user from a decoded JWT payload.
 */
const resolveUserFromDecoded = async (decoded) => {
  const envAdminUser = (process.env.ADMIN_USER || 'admin').trim();

  if (decoded.role === 'admin' && decoded.id === 'admin') {
    if (decoded.username !== envAdminUser) {
      return { errorStatus: 401, errorMessage: 'Not authorized: Admin session is no longer valid' };
    }
    return { user: buildEnvAdminUser() };
  }

  if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
    return { errorStatus: 401, errorMessage: 'Not authorized: Invalid token subject' };
  }

  const user = await User.findById(decoded.id).select('-passwordHash -otp -otpExpiry');
  if (!user) {
    return { errorStatus: 401, errorMessage: 'Not authorized: User no longer exists' };
  }

  if (decoded.role && decoded.role !== user.role) {
    return { errorStatus: 401, errorMessage: 'Not authorized: Role mismatch, please sign in again' };
  }

  if (user.role === 'citizen' && !user.isVerified) {
    return {
      errorStatus: 403,
      errorMessage: 'Account not verified: Please verify your email OTP to continue',
    };
  }

  return { user };
};

/**
 * Protect middleware - Verifies JWT Bearer token and attaches authenticated user
 */
const protect = async (req, res, next) => {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No Bearer token provided in Authorization header',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const { user, errorStatus, errorMessage } = await resolveUserFromDecoded(decoded);

    if (!user) {
      return res.status(errorStatus || 401).json({
        success: false,
        message: errorMessage || 'Not authorized',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('[AuthMiddleware] Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Invalid or expired token',
    });
  }
};

/**
 * Admin Only middleware - Restricts route to authenticated admin role
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied: Admin privileges required',
  });
};

/**
 * Citizen Only middleware - Restricts route to verified citizen accounts
 */
const citizenOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Citizen login required',
    });
  }
  if (req.user.role !== 'citizen') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Citizen account required for this action',
    });
  }
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account not verified: Please verify your email OTP before proceeding',
    });
  }
  return next();
};

/**
 * Optional Auth - Sets req.user if valid token is present, does not reject if absent
 */
const optionalAuth = async (req, res, next) => {
  const token = extractBearerToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      const { user } = await resolveUserFromDecoded(decoded);
      if (user) {
        req.user = user;
      }
    } catch (_) {
      // Continue without user
    }
  }
  next();
};

module.exports = {
  protect,
  adminOnly,
  citizenOnly,
  optionalAuth,
};
