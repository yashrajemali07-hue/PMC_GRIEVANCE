// models/constants.js - Pune Municipal Corporation (PMC) Domain Constants

// Official PMC Administrative Ward Offices
const PMC_WARDS = [
  'Aundh-Baner',
  'Kothrud-Bavdhan',
  'Shivajinagar-Ghole Road',
  'Kasba-Vishrambaugwada',
  'Bhavani Peth',
  'Bibwewadi',
  'Dhankawadi-Sahakarnagar',
  'Hadapsar-Mundhwa',
  'Kondhwa-Yewalewadi',
  'Nagar Road-Vadgaonsheri',
  'Sinhagad Road',
  'Warje-Karvenagar',
  'Wanowrie-Ramtekdi',
  'Yerawada-Kalas-Dhanori',
];

// Grievance Categories defined in PROJECT_BRIEF.md
const GRIEVANCE_CATEGORIES = [
  'Garbage',
  'Water Supply',
  'Drainage/Sewage',
  'Roads/Potholes',
  'Streetlights',
  'Encroachment',
  'Pollution',
  'Other',
];

// Grievance Lifecycle Statuses
const GRIEVANCE_STATUSES = [
  'Submitted',
  'In Progress',
  'Resolved',
  'Rejected',
];

// Priority Levels
const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

// Automatic priority rule mapping based on severity
const DEFAULT_PRIORITY_MAP = {
  'Drainage/Sewage': 'High',
  'Water Supply': 'High',
  'Pollution': 'High',
  'Garbage': 'Medium',
  'Roads/Potholes': 'Medium',
  'Encroachment': 'Medium',
  'Streetlights': 'Low',
  'Other': 'Low',
};

/**
 * Determine default priority from category if not explicitly chosen by citizen
 */
const calculatePriority = (category) => {
  return DEFAULT_PRIORITY_MAP[category] || 'Medium';
};

module.exports = {
  PMC_WARDS,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  PRIORITY_LEVELS,
  calculatePriority,
};
