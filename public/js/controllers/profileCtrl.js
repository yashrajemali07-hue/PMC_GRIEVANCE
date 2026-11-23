// public/js/controllers/profileCtrl.js - Citizen Profile & History
(function () {
  'use strict';

  angular.module('pmcApp').controller('ProfileCtrl', [
    '$scope',
    '$rootScope',
    'AuthService',
    'GrievanceService',
    function ($scope, $rootScope, AuthService, GrievanceService) {
      $scope.user = null;
      $scope.grievances = [];
      $scope.loading = true;

      // Load user profile & sync points with navbar
      AuthService.getMe()
        .then(function (res) {
          if (res.data && res.data.user) {
            $scope.user = res.data.user;
            localStorage.setItem('pmc_user', JSON.stringify(res.data.user));
            $rootScope.$broadcast('auth:changed', res.data.user);
          }
        })
        .catch(function () {
          $scope.user = AuthService.getUser();
        });

      // Load citizen's filed grievances
      GrievanceService.getMyGrievances()
        .then(function (res) {
          $scope.grievances = res.data.grievances || [];
        })
        .finally(function () {
          $scope.loading = false;
        });
    },
  ]);
})();
