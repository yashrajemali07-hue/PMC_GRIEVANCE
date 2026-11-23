// controllers/complaintController.js - Alias/Proxy to grievanceController
const grievanceController = require('./grievanceController');

module.exports = {
  ...grievanceController,
  createComplaint: grievanceController.createGrievance,
  getMyComplaints: grievanceController.getMyGrievances,
  trackComplaint: grievanceController.trackGrievance,
};
