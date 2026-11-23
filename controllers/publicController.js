// controllers/publicController.js - Public Information & Leaderboard Controller
const Grievance = require('../models/Grievance');
const User = require('../models/User');
const {
  PMC_WARDS,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  PRIORITY_LEVELS,
} = require('../models/constants');

/**
 * @desc    Get portal stats for homepage cards
 * @route   GET /api/stats
 * @access  Public
 */
const getPublicStats = async (req, res, next) => {
  try {
    const totalGrievances = await Grievance.countDocuments();
    const resolvedGrievances = await Grievance.countDocuments({ status: 'Resolved' });
    const inProgressGrievances = await Grievance.countDocuments({ status: 'In Progress' });
    const activeCitizens = await User.countDocuments({ role: 'citizen' });

    const recentGrievances = await Grievance.find()
      .select('grievanceId title category ward status priority createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      success: true,
      stats: {
        totalGrievances,
        resolvedGrievances,
        inProgressGrievances,
        activeCitizens,
        resolutionRate:
          totalGrievances > 0
            ? `${Math.round((resolvedGrievances / totalGrievances) * 100)}%`
            : '100%',
      },
      recentGrievances,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get civic points leaderboard of top citizens by points
 * @route   GET /api/leaderboard
 * @access  Public
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const leaders = await User.find({ role: 'citizen' })
      .select('name ward points createdAt')
      .sort({ points: -1 })
      .limit(10);

    const formattedLeaders = leaders.map((leader, index) => ({
      rank: index + 1,
      name: leader.name,
      ward: leader.ward,
      points: leader.points || 0,
      civicLevel: leader.civicLevel,
    }));

    return res.status(200).json({
      success: true,
      count: formattedLeaders.length,
      leaderboard: formattedLeaders,
      leaders: formattedLeaders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get domain metadata (wards, categories, statuses, priorities)
 * @route   GET /api/metadata
 * @access  Public
 */
const getMetadata = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      wards: PMC_WARDS,
      categories: GRIEVANCE_CATEGORIES,
      statuses: GRIEVANCE_STATUSES,
      priorities: PRIORITY_LEVELS,
    },
  });
};

module.exports = {
  getPublicStats,
  getLeaderboard,
  getMetadata,
};
