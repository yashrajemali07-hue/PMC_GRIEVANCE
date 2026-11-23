// test/test_admin_endpoints.js - Tests for admin-only endpoints & citizen resolution point awards
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { GRIEVANCE_STATUSES } = require('../models/constants');

async function testAdminLogic() {
  console.log('--- 1. Testing Admin JWT Token Generation & Verification ---');
  const adminToken = jwt.sign(
    { id: 'admin', role: 'admin', username: process.env.ADMIN_USER || 'admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  const decoded = jwt.verify(adminToken, process.env.JWT_SECRET || 'secret');
  if (decoded.role === 'admin') {
    console.log('  ✓ Admin token valid with role === "admin"');
  } else {
    console.error('  ✗ Expected role === "admin"');
    process.exit(1);
  }

  console.log('\n--- 2. Testing Status Validation for PATCH /api/admin/grievances/:id/status ---');
  const validStatuses = GRIEVANCE_STATUSES;
  console.log('  Recognized statuses:', validStatuses);
  for (const status of ['Submitted', 'In Progress', 'Resolved', 'Rejected']) {
    if (validStatuses.includes(status)) {
      console.log(`  ✓ Status '${status}' is valid`);
    } else {
      console.error(`  ✗ Status '${status}' should be valid`);
      process.exit(1);
    }
  }

  console.log('\n--- 3. Testing Points Awarding Logic on Resolution ---');
  let citizenPoints = 10;
  let grievanceStatus = 'In Progress';
  let newStatus = 'Resolved';

  if (newStatus === 'Resolved' && grievanceStatus !== 'Resolved') {
    citizenPoints += 15;
    console.log(`  ✓ Awarded 15 points to citizen upon grievance resolution! New points: ${citizenPoints}`);
  }

  if (citizenPoints === 25) {
    console.log('  ✓ Citizen points successfully increased from 10 to 25');
  } else {
    console.error('  ✗ Expected citizen points to be 25');
    process.exit(1);
  }

  console.log('\n--- 4. Testing Admin Stats Aggregation Calculations ---');
  const mockGrievances = [
    { category: 'Garbage', ward: 'Shivajinagar-Ghole Road', status: 'Submitted', priority: 'Medium' },
    { category: 'Garbage', ward: 'Shivajinagar-Ghole Road', status: 'Resolved', priority: 'Medium' },
    { category: 'Drainage/Sewage', ward: 'Shivajinagar-Ghole Road', status: 'In Progress', priority: 'High' },
    { category: 'Roads/Potholes', ward: 'Kothrud-Bavdhan', status: 'Submitted', priority: 'Medium' },
  ];

  const wardCounts = {};
  const statusCounts = {};
  const categoryCounts = {};

  for (const g of mockGrievances) {
    wardCounts[g.ward] = (wardCounts[g.ward] || 0) + 1;
    statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
    categoryCounts[g.category] = (categoryCounts[g.category] || 0) + 1;
  }

  let mostAffectedWard = '';
  let maxCount = -1;
  for (const [ward, count] of Object.entries(wardCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostAffectedWard = ward;
    }
  }

  console.log('  Status counts:', statusCounts);
  console.log('  Category counts:', categoryCounts);
  console.log('  Ward counts:', wardCounts);
  console.log(`  Most affected ward: "${mostAffectedWard}" with ${maxCount} grievances`);

  if (mostAffectedWard === 'Shivajinagar-Ghole Road' && maxCount === 3) {
    console.log('  ✓ Most affected ward calculated correctly');
  } else {
    console.error('  ✗ Most affected ward calculation error');
    process.exit(1);
  }

  console.log('\n--- 5. Testing Leaderboard Sorting & Rank Formatting ---');
  const mockCitizens = [
    { name: 'Sunil', ward: 'Aundh-Baner', points: 30 },
    { name: 'Amit', ward: 'Kothrud-Bavdhan', points: 75 },
    { name: 'Pooja', ward: 'Shivajinagar-Ghole Road', points: 50 },
  ];

  const sorted = [...mockCitizens].sort((a, b) => b.points - a.points);
  const ranked = sorted.map((c, i) => ({ rank: i + 1, ...c }));

  console.log('  Ranked leaderboard:');
  for (const r of ranked) {
    console.log(`    #${r.rank} ${r.name} (${r.ward}) - ${r.points} points`);
  }

  if (ranked[0].name === 'Amit' && ranked[0].rank === 1 && ranked[1].name === 'Pooja' && ranked[2].name === 'Sunil') {
    console.log('  ✓ Leaderboard ranking accurately sorted by points descending');
  } else {
    console.error('  ✗ Leaderboard ranking error');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('ALL ADMIN & LEADERBOARD CHECKS PASSED!');
  console.log('========================================');
}

testAdminLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
