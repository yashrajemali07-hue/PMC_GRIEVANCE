// middleware/authMiddleware.js - JWT Authentication & Role Authorization
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware - Verifies JWT Bearer token and attaches authenticated user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'pmc_secure_jwt_secret_key_change_in_production_2026'
      );

      // Check if this token belongs to the environment admin
      const envAdminUser = process.env.ADMIN_USER || 'admin';
      if (decoded.role === 'admin' && (decoded.id === 'admin' || decoded.username === envAdminUser)) {
        req.user = {
          _id: 'admin',
          id: 'admin',
          name: 'PMC Administrator',
          role: 'admin',
          username: envAdminUser,
          email: `${envAdminUser}@punecorporation.org`,
        };
        return next();
      }

      // Find citizen or DB admin user
      const user = await User.findById(decoded.id).select('-passwordHash -otp -otpExpiry');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized: User no longer exists',
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
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No Bearer token provided in Authorization header',
    });
  }
};

/**
 * Admin Only middleware - Restricts route to admin role
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
 * Optional Auth - Sets req.user if token is present, does not reject if absent
 */
const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'pmc_secure_jwt_secret_key_change_in_production_2026'
      );
      if (decoded.role === 'admin') {
        req.user = { id: 'admin', role: 'admin', name: 'PMC Administrator' };
      } else {
        req.user = await User.findById(decoded.id).select('-passwordHash -otp -otpExpiry');
      }
    } catch (err) {
      // Continue without user
    }
  }
  next();
};

module.exports = {
  protect,
  adminOnly,
  optionalAuth,
};
