// seed.js - Database Seeder for PMC Citizen Grievance Portal
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load Mongoose Models
const { User, Grievance, Counter } = require('./models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pmc_grievance_portal';

async function seedDatabase(shouldExit = true) {
  console.log('====================================================');
  console.log('[PMC Database Seeder] Connecting to MongoDB...');
  console.log(`[PMC Database Seeder] URI: ${MONGO_URI}`);
  console.log('====================================================');

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    }
    console.log('[PMC Database Seeder] MongoDB Connected successfully.');

    // 1. Clear existing sample data
    await User.deleteMany({ role: 'citizen' });
    await Grievance.deleteMany({});
    await Counter.deleteMany({});
    console.log('[PMC Database Seeder] Cleared previous citizen grievances and users.');

    // 2. Create sample users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    // Primary example citizen user
    const ramesh = await User.create({
      name: 'Ramesh Kulkarni',
      email: 'citizen@example.com',
      passwordHash: passwordHash,
      ward: 'Shivajinagar-Ghole Road',
      phone: '9822012345',
      role: 'citizen',
      isVerified: true,
      points: 20, // 5 for filing + 15 for resolution
    });

    // Additional leaderboard citizens
    await User.create([
      {
        name: 'Amit Deshmukh',
        email: 'amit@example.com',
        passwordHash: passwordHash,
        ward: 'Kothrud-Bavdhan',
        role: 'citizen',
        isVerified: true,
        points: 65,
      },
      {
        name: 'Pooja Patil',
        email: 'pooja@example.com',
        passwordHash: passwordHash,
        ward: 'Shivajinagar-Ghole Road',
        role: 'citizen',
        isVerified: true,
        points: 45,
      },
      {
        name: 'Sunil Joshi',
        email: 'sunil@example.com',
        passwordHash: passwordHash,
        ward: 'Aundh-Baner',
        role: 'citizen',
        isVerified: true,
        points: 30,
      },
      {
        name: 'Anita More',
        email: 'anita@example.com',
        passwordHash: passwordHash,
        ward: 'Kasba-Vishrambaugwada',
        role: 'citizen',
        isVerified: true,
        points: 15,
      },
    ]);
    console.log('[PMC Database Seeder] Seeded verified citizens for leaderboard.');

    // 3. Create Sample Pune Grievances
    const currentYear = new Date().getFullYear();

    const sampleGrievances = [
      {
        grievanceId: `PMC-${currentYear}-0001`,
        title: 'Severe sewage pipeline overflow on FC Road',
        description: 'Open drainage overflowing onto the pedestrian footpath near Fergusson College gate, causing hazardous foul odor and foot traffic blockages.',
        category: 'Drainage/Sewage',
        ward: 'Shivajinagar-Ghole Road',
        location: {
          lat: 18.5236,
          lng: 73.8415,
          address: 'Near Fergusson College Main Gate, FC Road, Shivajinagar, Pune',
        },
        priority: 'High',
        status: 'In Progress',
        assignedOfficer: 'Ward Inspector Suresh Patil',
        timeline: [
          {
            status: 'Submitted',
            remarks: 'Grievance submitted by citizen with photo proof',
            timestamp: new Date(Date.now() - 36 * 3600 * 1000),
            updatedBy: 'Ramesh Kulkarni',
          },
          {
            status: 'In Progress',
            remarks: 'Drainage jetting machine dispatched; inspection in progress | Assigned to: Ward Inspector Suresh Patil',
            timestamp: new Date(Date.now() - 12 * 3600 * 1000),
            updatedBy: 'PMC Administrator',
          },
        ],
        createdBy: ramesh._id,
        citizenName: ramesh.name,
        citizenEmail: ramesh.email,
        citizenPhone: ramesh.phone,
        createdAt: new Date(Date.now() - 36 * 3600 * 1000),
      },
      {
        grievanceId: `PMC-${currentYear}-0002`,
        title: 'Garbage dump accumulation behind Kothrud bus stand',
        description: 'Commercial vegetable waste and plastic bags overflowing from municipal bin onto roadside.',
        category: 'Garbage',
        ward: 'Kothrud-Bavdhan',
        location: {
          lat: 18.5074,
          lng: 73.8077,
          address: 'Behind Kothrud Bus Stand, Paud Road, Pune',
        },
        priority: 'Medium',
        status: 'Resolved',
        assignedOfficer: 'Sanitation Supervisor Dilip Shinde',
        resolutionRemarks: 'Garbage cleared by Swach compactor vehicle and area disinfected with bleaching powder.',
        resolvedAt: new Date(Date.now() - 4 * 3600 * 1000),
        timeline: [
          {
            status: 'Submitted',
            remarks: 'Grievance submitted by citizen',
            timestamp: new Date(Date.now() - 48 * 3600 * 1000),
            updatedBy: 'Ramesh Kulkarni',
          },
          {
            status: 'In Progress',
            remarks: 'Compactor vehicle scheduled for evening route | Assigned to: Sanitation Supervisor Dilip Shinde',
            timestamp: new Date(Date.now() - 24 * 3600 * 1000),
            updatedBy: 'PMC Administrator',
          },
          {
            status: 'Resolved',
            remarks: 'Garbage cleared by Swach compactor vehicle and area disinfected with bleaching powder.',
            timestamp: new Date(Date.now() - 4 * 3600 * 1000),
            updatedBy: 'Sanitation Supervisor Dilip Shinde',
          },
        ],
        createdBy: ramesh._id,
        citizenName: ramesh.name,
        citizenEmail: ramesh.email,
        citizenPhone: ramesh.phone,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      },
      {
        grievanceId: `PMC-${currentYear}-0003`,
        title: 'Dangerous crater-sized pothole on Baner High Street',
        description: 'Large pothole on the vehicular carriage way right before Westend Mall junction, causing vehicle damage and skidding risk.',
        category: 'Roads/Potholes',
        ward: 'Aundh-Baner',
        location: {
          lat: 18.559,
          lng: 73.7868,
          address: 'Baner High Street, near Westend Mall junction, Pune',
        },
        priority: 'High',
        status: 'Submitted',
        timeline: [
          {
            status: 'Submitted',
            remarks: 'Grievance submitted by citizen',
            timestamp: new Date(Date.now() - 6 * 3600 * 1000),
            updatedBy: 'Sunil Joshi',
          },
        ],
        citizenName: 'Sunil Joshi',
        citizenEmail: 'sunil@example.com',
        createdAt: new Date(Date.now() - 6 * 3600 * 1000),
      },
      {
        grievanceId: `PMC-${currentYear}-0004`,
        title: 'Dark street due to flickering sodium vapor streetlights',
        description: 'Multiple streetlights along Laxmi Road shopping street are malfunctioning, causing safety hazards for night pedestrians.',
        category: 'Streetlights',
        ward: 'Kasba-Vishrambaugwada',
        location: {
          lat: 18.5196,
          lng: 73.8553,
          address: 'Opposite Shaniwar Wada, Kasba Peth, Pune',
        },
        priority: 'Low',
        status: 'Submitted',
        timeline: [
          {
            status: 'Submitted',
            remarks: 'Grievance submitted by citizen',
            timestamp: new Date(Date.now() - 2 * 3600 * 1000),
            updatedBy: 'Anita More',
          },
        ],
        citizenName: 'Anita More',
        citizenEmail: 'anita@example.com',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
      {
        grievanceId: `PMC-${currentYear}-0005`,
        title: 'Muddy contaminated tap water supply in Tingre Nagar',
        description: 'Municipal tap supply emitting muddy brown water with foul odor since yesterday morning.',
        category: 'Water Supply',
        ward: 'Yerawada-Kalas-Dhanori',
        location: {
          lat: 18.5789,
          lng: 73.8785,
          address: 'Lane 4, Tingre Nagar, Dhanori Road, Pune',
        },
        priority: 'High',
        status: 'In Progress',
        assignedOfficer: 'Water Works Engineer K. Deshpande',
        timeline: [
          {
            status: 'Submitted',
            remarks: 'Grievance submitted by citizen',
            timestamp: new Date(Date.now() - 18 * 3600 * 1000),
            updatedBy: 'Pooja Patil',
          },
          {
            status: 'In Progress',
            remarks: 'Water pipeline isolation test in progress to find line puncture | Assigned to: Water Works Engineer K. Deshpande',
            timestamp: new Date(Date.now() - 8 * 3600 * 1000),
            updatedBy: 'PMC Administrator',
          },
        ],
        citizenName: 'Pooja Patil',
        citizenEmail: 'pooja@example.com',
        createdAt: new Date(Date.now() - 18 * 3600 * 1000),
      },
      {
        grievanceId: `PMC-${currentYear}-0006`,
        title: 'Unauthorized food stall encroachment blocking public walkway',
        description: 'Illegal temporary metal stalls blocking pedestrian transit right at Hadapsar bus terminus.',
        category: 'Encroachment',
        ward: 'Hadapsar-Mundhwa',
        location: {
          lat: 18.5018,
          lng: 73.9262,
          address: 'Near Gadital Bus Terminus, Hadapsar, Pune',
        },
        priority: 'Medium',
        status: 'Submitted',
        timeline: [
          {
            status: 'Submitted',
            remarks: 'Grievance submitted by citizen',
            timestamp: new Date(),
            updatedBy: 'Amit Deshmukh',
          },
        ],
        citizenName: 'Amit Deshmukh',
        citizenEmail: 'amit@example.com',
        createdAt: new Date(),
      },
    ];

    await Grievance.insertMany(sampleGrievances);
    console.log(`[PMC Database Seeder] Seeded ${sampleGrievances.length} sample Pune grievances.`);

    // 4. Initialize Counter so next complaint will be PMC-YYYY-0007
    await Counter.create({
      _id: `pmc_grievance_${currentYear}`,
      seq: sampleGrievances.length,
    });
    console.log(`[PMC Database Seeder] Initialized Counter sequence to ${sampleGrievances.length}.`);

    console.log('====================================================');
    console.log('DATABASE SEEDED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('Test Citizen Account:');
    console.log('  Email:    citizen@example.com');
    console.log('  Password: Password123!');
    console.log('  Ward:     Shivajinagar-Ghole Road');
    console.log('  Points:   20 pts');
    console.log('----------------------------------------------------');
    console.log('Test Admin Account (from .env):');
    console.log(`  Username: ${process.env.ADMIN_USER || 'admin'}`);
    console.log(`  Password: ${process.env.ADMIN_PASS || 'adminPMC@2026'}`);
    console.log('====================================================');

    if (shouldExit) {
      process.exit(0);
    }
    return { success: true };
  } catch (error) {
    console.error('[PMC Database Seeder Error]', error.message);
    if (error.message.includes('buffering timed out') || error.message.includes('ECONNREFUSED')) {
      console.error('[Notice] MongoDB is not running or unreachable at MONGO_URI.');
      console.error('[Notice] Please ensure local MongoDB or MongoDB Atlas is accessible.');
    }
    if (shouldExit) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  seedDatabase(true);
}

module.exports = seedDatabase;
