// models/Complaint.js - Alias/Proxy to Grievance model
const Grievance = require('./Grievance');

// Export Grievance model under Complaint identifier for backwards compatibility
module.exports = Grievance;
