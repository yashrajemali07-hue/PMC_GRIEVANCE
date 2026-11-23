// routes/grievanceRoutes.js - Grievance API Endpoints
const express = require('express');
const router = express.Router();
const {
  createGrievance,
  getMyGrievances,
  trackGrievance,
  getMapGrievances,
  updateGrievanceStatus,
} = require('../controllers/grievanceController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// 1. POST /api/grievances (citizen protected, multipart with image via multer)
router.post('/', protect, upload.single('image'), createGrievance);

// 2. GET /api/grievances/mine (citizen's own grievances)
router.get('/mine', protect, getMyGrievances);

// 3. GET /api/grievances/track/:grievanceId (public tracking by ID)
router.get('/track/:grievanceId', trackGrievance);

// 4. GET /api/grievances/map (public, lat/lng/priority/category only)
router.get('/map', getMapGrievances);

// 5. PUT /api/grievances/:id/status (admin status update with timeline logging)
router.put('/:id/status', protect, adminOnly, upload.single('resolutionImage'), updateGrievanceStatus);

module.exports = router;
