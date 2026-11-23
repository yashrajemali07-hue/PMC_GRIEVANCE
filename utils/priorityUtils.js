// utils/priorityUtils.js - Automatic grievance priority calculation based on category & keywords
/**
 * Determines grievance priority (High, Medium, Low) based on category and textual keywords
 * @param {string} category e.g. 'Drainage/Sewage', 'Water Supply', 'Garbage', etc.
 * @param {string} title Grievance title
 * @param {string} description Grievance detailed description
 * @returns {string} 'High' | 'Medium' | 'Low'
 */
function calculateAutoPriority(category = '', title = '', description = '') {
  const combined = `${category} ${title} ${description}`.toLowerCase();

  // 1. High Priority Keywords & severe categories
  const highKeywords = [
    'drainage',
    'sewage',
    'water supply',
    'contamination',
    'burst',
    'burst pipe',
    'overflow',
    'leakage',
    'waterlogging',
    'open manhole',
    'manhole',
    'electric spark',
    'open wire',
    'live wire',
    'hazardous',
    'hazard',
    'danger',
    'emergency',
    'urgent',
    'collapse',
    'toxic',
    'flood',
    'accident',
    'pollution',
    'chemical',
  ];

  for (const kw of highKeywords) {
    if (combined.includes(kw)) {
      return 'High';
    }
  }

  // 2. Medium Priority Keywords & moderate categories
  const mediumKeywords = [
    'garbage',
    'dumping',
    'waste',
    'pothole',
    'road',
    'crater',
    'encroachment',
    'illegal construction',
    'footpath blocked',
    'debris',
    'trash',
    'stagnant water',
    'broken pipe',
  ];

  for (const kw of mediumKeywords) {
    if (combined.includes(kw)) {
      return 'Medium';
    }
  }

  // 3. Low Priority Keywords
  const lowKeywords = [
    'streetlight',
    'street light',
    'lamp',
    'bulb',
    'flickering',
    'litter',
    'minor',
    'aesthetic',
    'tree trimming',
    'cleaning',
  ];

  for (const kw of lowKeywords) {
    if (combined.includes(kw)) {
      return 'Low';
    }
  }

  // Category-based fallback
  const fallbackRules = {
    'Drainage/Sewage': 'High',
    'Water Supply': 'High',
    'Pollution': 'High',
    'Garbage': 'Medium',
    'Roads/Potholes': 'Medium',
    'Encroachment': 'Medium',
    'Streetlights': 'Low',
    'Other': 'Medium',
  };

  return fallbackRules[category] || 'Medium';
}

module.exports = {
  calculateAutoPriority,
};
