// utils/geoUtils.js - Geospatial distance and nearby duplicate detection
/**
 * Calculate distance between two coordinate pairs in meters using the Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null} Distance in meters or null if invalid coordinates
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lat1 === undefined || isNaN(lat1) ||
    lon1 === null || lon1 === undefined || isNaN(lon1) ||
    lat2 === null || lat2 === undefined || isNaN(lat2) ||
    lon2 === null || lon2 === undefined || isNaN(lon2)
  ) {
    return null;
  }

  const R = 6371e3; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if there is an existing unresolved grievance with the same category within threshold meters (default ~100m)
 * @param {object} GrievanceModel Mongoose Model
 * @param {string} category Grievance category
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @param {number} thresholdMeters Default: 100 meters
 */
async function findNearbyDuplicate(GrievanceModel, category, lat, lng, thresholdMeters = 100) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }

  // Find unresolved grievances with same category and valid coordinates
  const activeGrievances = await GrievanceModel.find({
    category,
    status: { $in: ['Submitted', 'In Progress'] },
    'location.lat': { $ne: null },
    'location.lng': { $ne: null },
  }).select('grievanceId title category ward location status createdAt');

  let closest = null;
  let minDistance = Infinity;

  for (const item of activeGrievances) {
    const dist = haversineDistanceMeters(
      lat,
      lng,
      item.location.lat,
      item.location.lng
    );

    if (dist !== null && dist <= thresholdMeters) {
      if (dist < minDistance) {
        minDistance = dist;
        closest = item;
      }
    }
  }

  if (closest) {
    return {
      isDuplicateNearby: true,
      distanceMeters: Math.round(minDistance),
      nearbyGrievanceId: closest.grievanceId,
      nearbyTitle: closest.title,
      nearbyAddress: closest.location.address,
      status: closest.status,
      message: `Warning: A similar unresolved '${category}' grievance (${closest.grievanceId}) is active ~${Math.round(minDistance)} meters away at "${closest.location.address}". Your report was recorded.`,
    };
  }

  return null;
}

module.exports = {
  haversineDistanceMeters,
  findNearbyDuplicate,
};
