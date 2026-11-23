// routes/adminRoutes.js - PMC Admin Operations Endpoints
const express = require('express');
const router = express.Router();
const {
  getAdminGrievances,
  patchGrievanceStatus,
  deleteAdminGrievance,
  getAdminStats,
  getAllCitizens,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Protect all admin endpoints with JWT and admin role verification
router.use(protect, adminOnly);

// 1. GET /api/admin/grievances?status=&category=&ward=&priority=
router.get('/grievances', getAdminGrievances);
router.get('/complaints', getAdminGrievances); // Alias

// 2. PATCH /api/admin/grievances/:id/status (status + optional resolution photo)
const uploadResolution = upload.fields([
  { name: 'resolutionPhoto', maxCount: 1 },
  { name: 'resolutionImage', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

router.patch('/grievances/:id/status', uploadResolution, patchGrievanceStatus);
router.patch('/complaints/:id/status', uploadResolution, patchGrievanceStatus); // Alias
router.put('/grievances/:id/status', uploadResolution, patchGrievanceStatus); // PUT support
router.put('/complaints/:id', uploadResolution, patchGrievanceStatus);

// 3. DELETE /api/admin/grievances/:id
router.delete('/grievances/:id', deleteAdminGrievance);
router.delete('/complaints/:id', deleteAdminGrievance); // Alias

// 4. GET /api/admin/stats (counts by status, category, ward, most affected ward)
router.get('/stats', getAdminStats);
router.get('/analytics', getAdminStats); // Alias

// Citizens management
router.get('/citizens', getAllCitizens);

module.exports = router;
