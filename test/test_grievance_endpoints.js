// test/test_grievance_endpoints.js - Test suite for grievance endpoints & business logic
require('dotenv').config();
const { calculateAutoPriority } = require('../utils/priorityUtils');
const { haversineDistanceMeters } = require('../utils/geoUtils');
const Grievance = require('../models/Grievance');

async function testGrievanceLogic() {
  console.log('--- 1. Testing Keyword-Based Auto Priority ---');
  const testCases = [
    { category: 'Drainage/Sewage', title: 'Overflowing drain', desc: 'Water overflowing on road', expected: 'High' },
    { category: 'Streetlights', title: 'Broken streetlight', desc: 'Live electric spark from wire dangerous', expected: 'High' },
    { category: 'Garbage', title: 'Garbage pile', desc: 'Waste dumping near shop', expected: 'Medium' },
    { category: 'Roads/Potholes', title: 'Road crater', desc: 'Deep pothole', expected: 'Medium' },
    { category: 'Streetlights', title: 'Dark street', desc: 'Light bulb flickering at night', expected: 'Low' },
  ];

  for (const tc of testCases) {
    const priority = calculateAutoPriority(tc.category, tc.title, tc.desc);
    if (priority === tc.expected) {
      console.log(`  ✓ [${tc.category}] "${tc.title}" -> ${priority} (Matched expected ${tc.expected})`);
    } else {
      console.error(`  ✗ [${tc.category}] Expected ${tc.expected} but got ${priority}`);
      process.exit(1);
    }
  }

  console.log('\n--- 2. Testing Haversine Distance & ~100m Duplicate Detection ---');
  // Two points in Shivajinagar, Pune:
  // Point A: 18.5204, 73.8567
  // Point B: 18.5208, 73.8569 (~49 meters away)
  // Point C: 18.5250, 73.8600 (~620 meters away)
  const distNearby = haversineDistanceMeters(18.5204, 73.8567, 18.5208, 73.8569);
  console.log(`  Distance between Point A and Point B: ${Math.round(distNearby)} meters`);
  if (distNearby < 100) {
    console.log('  ✓ Correctly flagged within 100m duplicate threshold');
  } else {
    console.error('  ✗ Expected distance < 100m');
    process.exit(1);
  }

  const distFar = haversineDistanceMeters(18.5204, 73.8567, 18.5250, 73.8600);
  console.log(`  Distance between Point A and Point C: ${Math.round(distFar)} meters`);
  if (distFar > 100) {
    console.log('  ✓ Correctly identified as outside 100m duplicate threshold');
  } else {
    console.error('  ✗ Expected distance > 100m');
    process.exit(1);
  }

  console.log('\n--- 3. Testing Grievance Schema Validation & Timeline Structure ---');
  const dummyGrievance = new Grievance({
    grievanceId: 'PMC-2026-0001',
    title: 'Garbage dump near bus stop',
    description: 'Heavy waste accumulation',
    category: 'Garbage',
    ward: 'Shivajinagar-Ghole Road',
    location: {
      lat: 18.5204,
      lng: 73.8567,
      address: 'Near Shivajinagar Bus Stand, Pune',
    },
    imageUrl: '/uploads/grievance-test.jpg',
    priority: 'Medium',
    status: 'Submitted',
    timeline: [
      {
        status: 'Submitted',
        remarks: 'Grievance submitted by citizen',
        timestamp: new Date(),
        updatedBy: 'Ramesh Patil',
      },
      {
        status: 'In Progress',
        remarks: 'Assigned to Ward Inspector Suresh',
        timestamp: new Date(),
        updatedBy: 'PMC Officer',
      },
    ],
  });

  const valError = dummyGrievance.validateSync();
  if (!valError) {
    console.log('  ✓ Grievance instance passes all Mongoose validation rules');
    console.log(`  ✓ Timeline has ${dummyGrievance.timeline.length} sequential entries`);
  } else {
    console.error('  ✗ Validation failed:', valError.message);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('ALL GRIEVANCE LOGIC CHECKS PASSED!');
  console.log('========================================');
}

testGrievanceLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
