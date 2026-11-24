// test/test_api_integration.js - End-to-end HTTP integration tests for registration, OTP, and login
require('dotenv').config();
const http = require('http');
const app = require('../server');
const connectDB = require('../config/db');

async function runApiTests() {
  console.log('--- Connecting Database for Integration Tests ---');
  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  const postJson = (path, body, headers = {}) => {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request(
        `${baseUrl}${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...headers,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  };

  const getJson = (path, headers = {}) => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        `${baseUrl}${path}`,
        {
          method: 'GET',
          headers: { ...headers },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  };

  try {
    // 1. Metadata Check
    console.log('\n[TEST 1] GET /api/metadata');
    const metaRes = await getJson('/api/metadata');
    console.log('Status:', metaRes.status, 'Wards count:', metaRes.data.data.wards.length);
    if (metaRes.status !== 200 || !metaRes.data.data.wards.includes('Shivajinagar-Ghole Road')) {
      throw new Error('Metadata test failed');
    }
    console.log('✓ Metadata endpoint returned valid Pune wards');

    // 2. Citizen Registration
    const testEmail = `citizen.${Date.now()}@example.com`;
    console.log(`\n[TEST 2] POST /api/auth/register for ${testEmail}`);
    const regRes = await postJson('/api/auth/register', {
      name: 'Ananya Sharma',
      email: testEmail,
      password: 'Password123!',
      ward: 'Kothrud-Bavdhan',
      phone: '9876543210',
    });
    console.log('Status:', regRes.status, 'Message:', regRes.data.message);
    if (regRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
    }
    console.log('✓ Registration succeeded and dispatched OTP to email');

    // 3. Attempt login BEFORE verification (should return 403 requiresVerification)
    console.log('\n[TEST 3] POST /api/auth/login before OTP verification');
    const prematureLogin = await postJson('/api/auth/login', {
      email: testEmail,
      password: 'Password123!',
    });
    console.log('Status:', prematureLogin.status, 'requiresVerification:', prematureLogin.data.requiresVerification);
    if (prematureLogin.status !== 403 || !prematureLogin.data.requiresVerification) {
      throw new Error('Expected 403 with requiresVerification: true');
    }
    console.log('✓ Correctly blocked unverified login');

    // 4. Verify OTP (Test invalid OTP first, then valid OTP)
    console.log('\n[TEST 4a] POST /api/auth/verify-otp with invalid OTP');
    const invalidVerify = await postJson('/api/auth/verify-otp', {
      email: testEmail,
      otp: '000000',
    });
    console.log('Status:', invalidVerify.status, 'Message:', invalidVerify.data.message);
    if (invalidVerify.status !== 400) {
      throw new Error('Expected 400 for invalid OTP');
    }
    console.log('✓ Correctly rejected invalid OTP code');

    // Set known test OTP on user to simulate reading received email
    const User = require('../models/User');
    const citizenDbUser = await User.findOne({ email: testEmail });
    citizenDbUser.otp = '654321';
    citizenDbUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await citizenDbUser.save();

    console.log('\n[TEST 4b] POST /api/auth/verify-otp with valid email OTP (654321)');
    const verifyRes = await postJson('/api/auth/verify-otp', {
      email: testEmail,
      otp: '654321',
    });
    console.log('Status:', verifyRes.status, 'Token:', verifyRes.data.token ? 'Present' : 'Missing');
    if (verifyRes.status !== 200 || !verifyRes.data.token) {
      throw new Error(`Verify OTP failed: ${JSON.stringify(verifyRes.data)}`);
    }
    console.log('✓ OTP verified successfully and citizen authenticated');

    // 5. Citizen Login with correct credentials (via email)
    console.log('\n[TEST 5] POST /api/auth/login as verified citizen (via email)');
    const citizenLogin = await postJson('/api/auth/login', {
      email: testEmail,
      password: 'Password123!',
    });
    console.log('Status:', citizenLogin.status, 'User Name:', citizenLogin.data.user.name);
    if (citizenLogin.status !== 200 || !citizenLogin.data.token) {
      throw new Error(`Citizen login failed: ${JSON.stringify(citizenLogin.data)}`);
    }
    console.log('✓ Verified citizen login succeeded');

    // 5b. Citizen Login via phone number
    console.log('\n[TEST 5b] POST /api/auth/login as verified citizen (via phone number)');
    const phoneLogin = await postJson('/api/auth/login', {
      phone: '9876543210',
      password: 'Password123!',
    });
    console.log('Status:', phoneLogin.status, 'User Name:', phoneLogin.data.user.name);
    if (phoneLogin.status !== 200 || !phoneLogin.data.token) {
      throw new Error(`Citizen phone login failed: ${JSON.stringify(phoneLogin.data)}`);
    }
    console.log('✓ Citizen phone number login succeeded');

    // 6. Admin Login with ADMIN_USER and ADMIN_PASS
    console.log('\n[TEST 6] POST /api/auth/login as PMC Officer (admin)');
    const adminLogin = await postJson('/api/auth/login', {
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASS || 'adminPMC@2026',
    });
    console.log('Status:', adminLogin.status, 'Admin Role:', adminLogin.data.user.role);
    if (adminLogin.status !== 200 || adminLogin.data.user.role !== 'admin') {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    console.log('✓ PMC Officer login succeeded with role: admin');

    // 7. Protected Route GET /api/auth/me with Citizen Token
    console.log('\n[TEST 7] GET /api/auth/me with Citizen Token');
    const meRes = await getJson('/api/auth/me', {
      Authorization: `Bearer ${citizenLogin.data.token}`,
    });
    console.log('Status:', meRes.status, 'Citizen Email:', meRes.data.user.email);
    if (meRes.status !== 200 || meRes.data.user.email !== testEmail) {
      throw new Error('Get profile / me failed');
    }
    console.log('✓ Protected citizen profile retrieved successfully');

    console.log('\n======================================================');
    console.log('ALL HTTP INTEGRATION TESTS PASSED 100% SUCCESSFULLY!');
    console.log('======================================================\n');
  } finally {
    server.close();
    if (global.__mongoMemoryServer) {
      await global.__mongoMemoryServer.stop();
    }
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

runApiTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Integration test error:', err);
    process.exit(1);
  });
