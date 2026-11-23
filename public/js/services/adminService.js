// public/js/services/adminService.js - Admin Operations Service ($http)
(function () {
  'use strict';

  angular.module('pmcApp').factory('AdminService', [
    '$http',
    function ($http) {
      const service = {};

      // Get grievances with query filters
      service.getGrievances = function (params) {
        return $http.get('/api/admin/grievances', { params: params });
      };

      // Patch status + optional resolution photo
      service.patchStatus = function (id, formData) {
        return $http.patch('/api/admin/grievances/' + encodeURIComponent(id) + '/status', formData, {
          transformRequest: angular.identity,
          headers: { 'Content-Type': undefined },
        });
      };

      // Delete grievance
      service.deleteGrievance = function (id) {
        return $http.delete('/api/admin/grievances/' + encodeURIComponent(id));
      };

      // Admin stats (by status, category, ward, most affected ward)
      service.getStats = function () {
        return $http.get('/api/admin/stats');
      };

      // All citizens
      service.getCitizens = function () {
        return $http.get('/api/admin/citizens');
      };

      return service;
    },
  ]);
})();
