// controllers/grievanceController.js - Grievance Management Controller
const Grievance = require('../models/Grievance');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { PMC_WARDS, GRIEVANCE_CATEGORIES } = require('../models/constants');
const { calculateAutoPriority } = require('../utils/priorityUtils');
const { findNearbyDuplicate } = require('../utils/geoUtils');

/**
 * Generate sequential PMC Grievance ID: PMC-YYYY-XXXX (e.g., PMC-2026-0001)
 */
const generateGrievanceId = async () => {
  const year = new Date().getFullYear();
  const counterKey = `pmc_grievance_${year}`;
  const seq = await Counter.getNextSequence(counterKey);
  const paddedSeq = String(seq).padStart(4, '0');
  return `PMC-${year}-${paddedSeq}`;
};

/**
 * @desc    Submit a new citizen grievance (multipart with image via multer)
 * @route   POST /api/grievances
 * @access  Private (Citizen)
 */
const createGrievance = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      ward,
      address,
      latitude,
      longitude,
      lat,
      lng,
      priority,
    } = req.body;

    // 1. Input Validation
    const errors = [];

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      errors.push('Title is required and must be at least 3 characters long');
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      errors.push('Description is required and must be at least 5 characters long');
    }

    if (!category || !GRIEVANCE_CATEGORIES.includes(category)) {
      errors.push(`Category must be one of: ${GRIEVANCE_CATEGORIES.join(', ')}`);
    }

    if (!ward || !PMC_WARDS.includes(ward)) {
      errors.push(`Ward must be one of: ${PMC_WARDS.join(', ')}`);
    }

    // Extract and validate address
    const locAddress =
      address ||
      (req.body.location && req.body.location.address) ||
      '';

    if (!locAddress || typeof locAddress !== 'string' || locAddress.trim().length < 3) {
      errors.push('Location address/landmark is required (minimum 3 characters)');
    }

    // Parse and validate coordinates if supplied
    let numLat = null;
    let numLng = null;

    const rawLat = lat !== undefined ? lat : (latitude !== undefined ? latitude : (req.body.location && req.body.location.lat));
    const rawLng = lng !== undefined ? lng : (longitude !== undefined ? longitude : (req.body.location && req.body.location.lng));

    if (rawLat !== undefined && rawLat !== null && rawLat !== '') {
      numLat = parseFloat(rawLat);
      if (isNaN(numLat) || numLat < -90 || numLat > 90) {
        errors.push('Latitude must be a valid number between -90 and 90');
      }
    }

    if (rawLng !== undefined && rawLng !== null && rawLng !== '') {
      numLng = parseFloat(rawLng);
      if (isNaN(numLng) || numLng < -180 || numLng > 180) {
        errors.push('Longitude must be a valid number between -180 and 180');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // 2. Automatic priority calculation based on category & keywords
    const computedPriority = priority && ['High', 'Medium', 'Low'].includes(priority)
      ? priority
      : calculateAutoPriority(category, title, description);

    // 3. Duplicate nearby grievance check (~100 meters)
    let duplicateWarning = null;
    if (numLat !== null && numLng !== null) {
      duplicateWarning = await findNearbyDuplicate(
        Grievance,
        category,
        numLat,
        numLng,
        100 // 100 meters threshold
      );
    }

    // 4. Handle Multer image upload saved in /uploads
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl.trim();
    }

    // 5. Generate sequential ID (e.g. PMC-2026-0001)
    const grievanceId = await generateGrievanceId();

    // 6. Timeline entry for creation
    const citizenUser = req.user || {};
    const initialTimeline = [
      {
        status: 'Submitted',
        remarks: 'Grievance submitted by citizen',
        timestamp: new Date(),
        updatedBy: citizenUser.name || 'Citizen',
      },
    ];

    // 7. Create Grievance document in MongoDB
    const grievance = await Grievance.create({
      grievanceId,
      title: title.trim(),
      description: description.trim(),
      category,
      ward,
      location: {
        lat: numLat,
        lng: numLng,
        address: locAddress.trim(),
      },
      imageUrl,
      priority: computedPriority,
      status: 'Submitted',
      timeline: initialTimeline,
      createdBy: citizenUser._id || null,
      citizenName: citizenUser.name || '',
      citizenEmail: citizenUser.email || '',
      citizenPhone: citizenUser.phone || '',
      createdAt: new Date(),
    });

    // 8. Reward citizen with civic points (+5 points)
    if (citizenUser._id) {
      await User.findByIdAndUpdate(citizenUser._id, {
        $inc: { points: 5 },
      });
    }

    // Return 201 Created with grievance details and optional duplicate warning
    return res.status(201).json({
      success: true,
      message: `Grievance submitted successfully. Your tracking ID is ${grievanceId}`,
      grievanceId,
      grievance,
      duplicateWarning,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all grievances filed by the logged-in citizen
 * @route   GET /api/grievances/mine
 * @access  Private (Citizen)
 */
const getMyGrievances = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: Citizen login required',
      });
    }

    const grievances = await Grievance.find({
      $or: [
        { createdBy: req.user._id },
        { citizenEmail: req.user.email.toLowerCase() },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track grievance by its unique grievanceId (e.g., PMC-2026-0001)
 * @route   GET /api/grievances/track/:grievanceId
 * @access  Public
 */
const trackGrievance = async (req, res, next) => {
  try {
    const rawId = (req.params.grievanceId || '').trim();

    if (!rawId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Grievance ID',
      });
    }

    const grievance = await Grievance.findOne({
      grievanceId: { $regex: new RegExp(`^${rawId}$`, 'i') },
    });

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: `Grievance not found with ID '${rawId}'. Please verify the ID.`,
      });
    }

    return res.status(200).json({
      success: true,
      grievance,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active grievances for map display (lat, lng, priority, category only)
 * @route   GET /api/grievances/map
 * @access  Public
 */
const getMapGrievances = async (req, res, next) => {
  try {
    const grievances = await Grievance.find({
      'location.lat': { $ne: null },
      'location.lng': { $ne: null },
    })
      .select('grievanceId location.lat location.lng priority category -_id')
      .lean();

    // Map strictly to requested properties: lat, lng, priority, category (with grievanceId for map popups)
    const mapData = grievances.map((item) => ({
      grievanceId: item.grievanceId,
      lat: item.location.lat,
      lng: item.location.lng,
      priority: item.priority,
      category: item.category,
    }));

    return res.status(200).json({
      success: true,
      count: mapData.length,
      data: mapData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update grievance status and record a timeline entry on every change
 * @route   PUT /api/grievances/:id/status
 * @access  Private (Admin)
 */
const updateGrievanceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks, assignedOfficer } = req.body;

    const grievance = await Grievance.findOne({
      $or: [{ grievanceId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!grievance) {
      return res.status(404).json({
        success: false,
        message: `Grievance not found with ID '${id}'`,
      });
    }

    const previousStatus = grievance.status;
    const newStatus = status || grievance.status;

    // Handle resolution image upload if provided
    let resolutionImage = grievance.resolutionImage;
    if (req.file) {
      resolutionImage = `/uploads/${req.file.filename}`;
    }

    // Compose timeline note
    let timelineRemark = remarks || `Status transitioned from ${previousStatus} to ${newStatus}`;
    if (assignedOfficer) {
      timelineRemark += ` | Assigned to: ${assignedOfficer}`;
    }

    // Add a timeline entry on every change
    grievance.timeline.push({
      status: newStatus,
      remarks: timelineRemark,
      timestamp: new Date(),
      updatedBy: req.user ? req.user.name || 'PMC Officer' : 'PMC Officer',
    });

    grievance.status = newStatus;
    if (assignedOfficer) grievance.assignedOfficer = assignedOfficer.trim();
    if (resolutionImage) grievance.resolutionImage = resolutionImage;
    if (remarks) grievance.resolutionRemarks = remarks.trim();

    // Reward citizen with +15 points on resolution
    if (newStatus === 'Resolved' && previousStatus !== 'Resolved') {
      if (grievance.createdBy) {
        await User.findByIdAndUpdate(grievance.createdBy, {
          $inc: { points: 15 },
        });
      }
    }

    await grievance.save();

    return res.status(200).json({
      success: true,
      message: `Grievance ${grievance.grievanceId} updated successfully`,
      grievance,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGrievance,
  getMyGrievances,
  trackGrievance,
  getMapGrievances,
  updateGrievanceStatus,
};
