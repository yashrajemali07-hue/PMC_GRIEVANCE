// public/js/controllers/navbarCtrl.js - Controls responsive navbar state
(function () {
  'use strict';

  angular.module('pmcApp').controller('NavbarCtrl', [
    '$scope',
    '$location',
    '$rootScope',
    'AuthService',
    function ($scope, $location, $rootScope, AuthService) {
      function refresh() {
        $scope.currentUser = AuthService.getUser();
        $scope.isLoggedIn = AuthService.isAuthenticated();
        $scope.isAdmin = AuthService.isAdmin();
        $scope.isCitizen = AuthService.isCitizen();
      }

      refresh();

      $rootScope.$on('auth:changed', function () {
        refresh();
      });

      $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
      };

      $scope.logout = function () {
        AuthService.logout();
        refresh();
        $location.path('/login');
      };
    },
  ]);
})();
