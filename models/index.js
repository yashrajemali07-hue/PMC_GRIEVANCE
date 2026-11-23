// models/index.js - Central export for Mongoose models
const User = require('./User');
const Grievance = require('./Grievance');
const Counter = require('./Counter');
const constants = require('./constants');

module.exports = {
  User,
  Grievance,
  Complaint: Grievance,
  Counter,
  ...constants,
};
