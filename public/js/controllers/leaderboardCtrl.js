// public/js/controllers/leaderboardCtrl.js - Top Citizens Leaderboard
(function () {
  'use strict';

  angular.module('pmcApp').controller('LeaderboardCtrl', [
    '$scope',
    'GrievanceService',
    function ($scope, GrievanceService) {
      $scope.leaderboard = [];
      $scope.loading = true;

      GrievanceService.getLeaderboard()
        .then(function (res) {
          $scope.leaderboard =
            (res.data && res.data.leaderboard) ||
            (res.data && res.data.leaders) ||
            [];
        })
        .finally(function () {
          $scope.loading = false;
        });
    },
  ]);
})();
