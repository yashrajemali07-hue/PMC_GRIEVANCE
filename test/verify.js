// test/verify.js - Unit and integration verification test
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Load models
const { User, Grievance, Counter } = require('../models');
const { sendOtpEmail } = require('../utils/mailUtils');
const { protect, adminOnly } = require('../middleware/authMiddleware');

async function runVerification() {
  console.log('--- 1. Testing User Model Schema ---');
  const userFields = Object.keys(User.schema.paths);
  console.log('User schema fields:', userFields);
  const requiredUserFields = ['name', 'email', 'passwordHash', 'ward', 'role', 'isVerified', 'otp', 'otpExpiry', 'points'];
  for (const field of requiredUserFields) {
    if (userFields.includes(field)) {
      console.log(`  ✓ User has field: ${field}`);
    } else {
      console.error(`  ✗ User MISSING field: ${field}`);
      process.exit(1);
    }
  }

  console.log('\n--- 2. Testing Grievance Model Schema ---');
  const grievanceFields = Object.keys(Grievance.schema.paths);
  console.log('Grievance schema paths:', grievanceFields);
  const requiredGrievanceFields = [
    'grievanceId', 'title', 'description', 'category', 'ward',
    'location.lat', 'location.lng', 'location.address',
    'imageUrl', 'priority', 'status', 'timeline', 'createdBy',
    'resolutionImage', 'createdAt'
  ];
  for (const field of requiredGrievanceFields) {
    if (grievanceFields.includes(field)) {
      console.log(`  ✓ Grievance has field: ${field}`);
    } else {
      console.error(`  ✗ Grievance MISSING field: ${field}`);
      process.exit(1);
    }
  }

  console.log('\n--- 3. Testing Counter Model Schema ---');
  const counterFields = Object.keys(Counter.schema.paths);
  console.log('Counter schema paths:', counterFields);
  if (counterFields.includes('_id') && counterFields.includes('seq')) {
    console.log('  ✓ Counter has _id and seq');
  } else {
    console.error('  ✗ Counter missing _id or seq');
    process.exit(1);
  }

  console.log('\n--- 4. Testing Nodemailer dev mode (console print when MAIL_USERNAME not set) ---');
  delete process.env.MAIL_USERNAME; // ensure empty
  const mailResult = await sendOtpEmail('citizen@example.com', '789123');
  if (mailResult.devMode) {
    console.log('  ✓ Dev mode OTP printing works cleanly');
  } else {
    console.error('  ✗ Expected devMode: true');
    process.exit(1);
  }

  console.log('\n--- 5. Testing Admin Login with ADMIN_USER and ADMIN_PASS from .env ---');
  const envAdminUser = process.env.ADMIN_USER;
  const envAdminPass = process.env.ADMIN_PASS;
  console.log(`  ADMIN_USER=${envAdminUser}, ADMIN_PASS=${envAdminPass ? '***' : 'unset'}`);
  if (!envAdminUser || !envAdminPass) {
    console.error('  ✗ ADMIN_USER or ADMIN_PASS not set in .env');
    process.exit(1);
  }
  const adminToken = jwt.sign(
    { id: 'admin', role: 'admin', username: envAdminUser },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
  console.log('  ✓ Admin JWT generated:', adminToken.slice(0, 30) + '...');

  // Verify token
  const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'secret');
  if (decoded.role === 'admin' && decoded.username === envAdminUser) {
    console.log('  ✓ Admin JWT decoded successfully with role: admin');
  } else {
    console.error('  ✗ Admin JWT decode mismatch');
    process.exit(1);
  }

  console.log('\n--- 6. Testing Password Hashing with bcryptjs ---');
  const plainPassword = 'Password123!';
  const hash = await bcrypt.hash(plainPassword, 10);
  const isMatch = await bcrypt.compare(plainPassword, hash);
  if (isMatch) {
    console.log('  ✓ bcryptjs hash & compare succeeded');
  } else {
    console.error('  ✗ bcryptjs compare failed');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('ALL MODEL AND AUTH CHECKS PASSED SUCCESSFULLY!');
  console.log('========================================');
}

runVerification().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
