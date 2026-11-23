// controllers/adminController.js - PMC Admin Operations Controller
const Grievance = require('../models/Grievance');
const User = require('../models/User');
const { GRIEVANCE_STATUSES } = require('../models/constants');

/**
 * @desc    Get filtered grievances for PMC Admin
 * @route   GET /api/admin/grievances?status=&category=&ward=&priority=
 * @access  Private (Admin Only)
 */
const getAdminGrievances = async (req, res, next) => {
  try {
    const {
      status,
      category,
      ward,
      priority,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    // Apply query filters
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (ward) filter.ward = ward;
    if (priority) filter.priority = priority;

    // Optional text search across ID, title, description, and address
    if (search) {
      filter.$or = [
        { grievanceId: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Grievance.countDocuments(filter);
    const grievances = await Grievance.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email ward points civicLevel');

    return res.status(200).json({
      success: true,
      count: grievances.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      filters: {
        status: status || null,
        category: category || null,
        ward: ward || null,
        priority: priority || null,
      },
      grievances,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update grievance status + optional resolution photo & award points on resolution
 * @route   PATCH /api/admin/grievances/:id/status
 * @access  Private (Admin Only)
 */
const patchGrievanceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks, assignedOfficer } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: `Status is required. Must be one of: ${GRIEVANCE_STATUSES.join(', ')}`,
      });
    }

    if (!GRIEVANCE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Must be one of: ${GRIEVANCE_STATUSES.join(', ')}`,
      });
    }

    // Find grievance by grievanceId or MongoDB _id
    const grievance = await Grievance.findOne({
      $or: [
        { grievanceId: { $regex: new RegExp(`^${id}$`, 'i') } },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: `Grievance not found with ID '${id}'`,
      });
    }

    const previousStatus = grievance.status;
    const newStatus = status;

    // Check if a resolution photo was uploaded via Multer
    let resolutionImage = grievance.resolutionImage;
    if (req.file) {
      resolutionImage = `/uploads/${req.file.filename}`;
    } else if (req.files) {
      const photoFile = req.files.resolutionPhoto?.[0] || req.files.resolutionImage?.[0] || req.files.image?.[0];
      if (photoFile) {
        resolutionImage = `/uploads/${photoFile.filename}`;
      }
    } else if (req.body.resolutionImage) {
      resolutionImage = req.body.resolutionImage;
    }

    // Compose audit timeline entry
    let timelineRemark = remarks || `Status changed from ${previousStatus} to ${newStatus}`;
    if (assignedOfficer) {
      timelineRemark += ` | Assigned to: ${assignedOfficer}`;
    }

    grievance.timeline.push({
      status: newStatus,
      remarks: timelineRemark,
      timestamp: new Date(),
      updatedBy: req.user ? req.user.name || 'PMC Administrator' : 'PMC Administrator',
    });

    grievance.status = newStatus;
    grievance.resolutionImage = resolutionImage;
    if (assignedOfficer) grievance.assignedOfficer = assignedOfficer.trim();
    if (remarks) grievance.resolutionRemarks = remarks.trim();

    let pointsAwarded = 0;

    // Award bonus points to the citizen when marked Resolved
    if (newStatus === 'Resolved' && previousStatus !== 'Resolved') {
      grievance.resolvedAt = new Date();
      pointsAwarded = 15; // 15 civic points on resolution
      const citizenId =
        (grievance.createdBy && (grievance.createdBy._id || grievance.createdBy)) ||
        null;
      if (citizenId) {
        await User.findByIdAndUpdate(citizenId, {
          $inc: { points: pointsAwarded },
        });
      } else if (grievance.citizenEmail) {
        await User.findOneAndUpdate(
          { email: grievance.citizenEmail.toLowerCase() },
          { $inc: { points: pointsAwarded } }
        );
      }
    }

    await grievance.save();

    return res.status(200).json({
      success: true,
      message: `Grievance ${grievance.grievanceId} updated to '${newStatus}'`,
      pointsAwarded,
      grievance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete grievance by ID
 * @route   DELETE /api/admin/grievances/:id
 * @access  Private (Admin Only)
 */
const deleteAdminGrievance = async (req, res, next) => {
  try {
    const { id } = req.params;

    const grievance = await Grievance.findOneAndDelete({
      $or: [
        { grievanceId: { $regex: new RegExp(`^${id}$`, 'i') } },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: `Grievance not found with ID '${id}'`,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Grievance ${grievance.grievanceId} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get grievance statistics: counts by status, category, ward, and most affected ward
 * @route   GET /api/admin/stats
 * @access  Private (Admin Only)
 */
const getAdminStats = async (req, res, next) => {
  try {
    const total = await Grievance.countDocuments();

    // Counts by status
    const submitted = await Grievance.countDocuments({ status: 'Submitted' });
    const inProgress = await Grievance.countDocuments({ status: 'In Progress' });
    const resolved = await Grievance.countDocuments({ status: 'Resolved' });
    const rejected = await Grievance.countDocuments({ status: 'Rejected' });
    const highPriority = await Grievance.countDocuments({ priority: 'High' });

    // Category aggregation
    const categoryStats = await Grievance.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Ward aggregation
    const wardStats = await Grievance.aggregate([
      { $group: { _id: '$ward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Status aggregation
    const statusStats = await Grievance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Registered citizens count
    const totalCitizens = await User.countDocuments({ role: 'citizen' });

    // Identify the most affected ward (ward with the highest count)
    const mostAffectedWard =
      wardStats.length > 0 && wardStats[0]._id ? wardStats[0]._id : 'N/A';

    const resolutionRate =
      total > 0 ? `${Math.round((resolved / total) * 100)}%` : '0%';

    return res.status(200).json({
      success: true,
      stats: {
        total,
        byStatus: {
          Submitted: submitted,
          'In Progress': inProgress,
          Resolved: resolved,
          Rejected: rejected,
        },
        byCategory: categoryStats.map((item) => ({
          category: item._id,
          count: item.count,
        })),
        byWard: wardStats.map((item) => ({
          ward: item._id,
          count: item.count,
        })),
        mostAffectedWard,
        highPriority,
        totalCitizens,
        resolutionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all registered citizens
 * @route   GET /api/admin/citizens
 * @access  Private (Admin Only)
 */
const getAllCitizens = async (req, res, next) => {
  try {
    const citizens = await User.find({ role: 'citizen' })
      .select('-passwordHash -otp -otpExpiry')
      .sort({ points: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: citizens.length,
      citizens,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminGrievances,
  patchGrievanceStatus,
  deleteAdminGrievance,
  getAdminStats,
  getAllCitizens,
  // Aliases for backwards compatibility
  getDashboardAnalytics: getAdminStats,
  updateComplaintStatus: patchGrievanceStatus,
  deleteComplaint: deleteAdminGrievance,
};
