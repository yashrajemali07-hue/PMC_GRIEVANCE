// public/js/controllers/trackCtrl.js - Track Grievance Status & Timeline
(function () {
  'use strict';

  angular.module('pmcApp').controller('TrackCtrl', [
    '$scope',
    '$routeParams',
    'GrievanceService',
    function ($scope, $routeParams, GrievanceService) {
      $scope.searchId = $routeParams.id || '';
      $scope.grievance = null;
      $scope.errorMsg = null;
      $scope.loading = false;

      $scope.track = function (id) {
        const queryId = id || $scope.searchId;
        if (!queryId) return;

        $scope.loading = true;
        $scope.errorMsg = null;
        $scope.grievance = null;

        GrievanceService.trackGrievance(queryId)
          .then(function (res) {
            $scope.grievance = res.data.grievance;
          })
          .catch(function (err) {
            $scope.errorMsg =
              (err.data && err.data.message) ||
              `No grievance found with ID "${queryId}". Please verify the ID.`;
          })
          .finally(function () {
            $scope.loading = false;
          });
      };

      // Auto-search if query ID provided in route
      if ($routeParams.id) {
        $scope.track($routeParams.id);
      }
    },
  ]);
})();
