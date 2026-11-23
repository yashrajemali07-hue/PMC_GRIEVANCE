// public/js/services/grievanceService.js - Grievance API Service ($http)
(function () {
  'use strict';

  angular.module('pmcApp').factory('GrievanceService', [
    '$http',
    function ($http) {
      const service = {};

      // Submit new grievance using multipart/form-data with photo
      service.createGrievance = function (formData) {
        return $http.post('/api/grievances', formData, {
          transformRequest: angular.identity,
          headers: { 'Content-Type': undefined }, // Let browser set boundary
        });
      };

      // Get citizen's own grievances
      service.getMyGrievances = function () {
        return $http.get('/api/grievances/mine');
      };

      // Public track grievance by ID
      service.trackGrievance = function (grievanceId) {
        return $http.get('/api/grievances/track/' + encodeURIComponent(grievanceId));
      };

      // Public map coordinates
      service.getMapGrievances = function () {
        return $http.get('/api/grievances/map');
      };

      // Public PMC Metadata (wards, categories, priorities, statuses)
      service.getMetadata = function () {
        return $http.get('/api/metadata');
      };

      // Public high level statistics
      service.getPublicStats = function () {
        return $http.get('/api/stats');
      };

      // Public leaderboard
      service.getLeaderboard = function () {
        return $http.get('/api/leaderboard');
      };

      return service;
    },
  ]);
})();
