// public/js/app.js - Main AngularJS 1.8 Application & Route Configuration
(function () {
  'use strict';

  const app = angular.module('pmcApp', ['ngRoute']);

  // Configuration for ngRoute and HTTP JWT Interceptor
  app.config([
    '$routeProvider',
    '$locationProvider',
    '$httpProvider',
    function ($routeProvider, $locationProvider, $httpProvider) {
      // Use hash prefix for routing
      $locationProvider.hashPrefix('');

      $routeProvider
        // Public Home (with map)
        .when('/', {
          templateUrl: 'views/home.html',
          controller: 'HomeCtrl',
        })
        // Citizen Registration
        .when('/register', {
          templateUrl: 'views/register.html',
          controller: 'AuthCtrl',
        })
        // Verify OTP
        .when('/verify-otp', {
          templateUrl: 'views/verify-otp.html',
          controller: 'AuthCtrl',
        })
        // Citizen Login
        .when('/login', {
          templateUrl: 'views/login.html',
          controller: 'AuthCtrl',
        })
        // File Grievance (Citizen Protected)
        .when('/file-grievance', {
          templateUrl: 'views/file-grievance.html',
          controller: 'FileGrievanceCtrl',
          requiresAuth: true,
        })
        // Track Grievance (Public by ID)
        .when('/track', {
          templateUrl: 'views/track.html',
          controller: 'TrackCtrl',
        })
        .when('/track/:id', {
          templateUrl: 'views/track.html',
          controller: 'TrackCtrl',
        })
        // My Profile & Grievances (Citizen Protected)
        .when('/profile', {
          templateUrl: 'views/profile.html',
          controller: 'ProfileCtrl',
          requiresAuth: true,
        })
        // Public Leaderboard
        .when('/leaderboard', {
          templateUrl: 'views/leaderboard.html',
          controller: 'LeaderboardCtrl',
        })
        // Public Awareness & Helpline
        .when('/awareness', {
          templateUrl: 'views/awareness.html',
          controller: 'AwarenessCtrl',
        })
        // Admin Login
        .when('/admin-login', {
          templateUrl: 'views/admin-login.html',
          controller: 'AuthCtrl',
        })
        // Admin Dashboard (Admin Only)
        .when('/admin-dashboard', {
          templateUrl: 'views/admin-dashboard.html',
          controller: 'AdminDashboardCtrl',
          requiresAdmin: true,
        })
        // Fallback
        .otherwise({
          redirectTo: '/',
        });

      // Register JWT HTTP Interceptor
      $httpProvider.interceptors.push('AuthInterceptor');
    },
  ]);

  // AuthInterceptor: Automatically attaches JWT token to outgoing $http requests
  app.factory('AuthInterceptor', [
    '$q',
    '$location',
    function ($q, $location) {
      return {
        request: function (config) {
          const token = localStorage.getItem('pmc_token');
          if (token && !config.headers.Authorization) {
            config.headers.Authorization = 'Bearer ' + token;
          }
          return config;
        },
        responseError: function (rejection) {
          // If server returns 401 Unauthorized on protected route
          if (rejection.status === 401) {
            const currentPath = $location.path();
            if (
              currentPath === '/file-grievance' ||
              currentPath === '/profile' ||
              currentPath === '/admin-dashboard'
            ) {
              localStorage.removeItem('pmc_token');
              localStorage.removeItem('pmc_user');
              $location.path(currentPath === '/admin-dashboard' ? '/admin-login' : '/login');
            }
          }
          return $q.reject(rejection);
        },
      };
    },
  ]);

  // Route security check on route changes
  app.run([
    '$rootScope',
    '$location',
    'AuthService',
    function ($rootScope, $location, AuthService) {
      $rootScope.$on('$routeChangeStart', function (event, next) {
        if (!next) return;

        // Requires admin check
        if (next.requiresAdmin && !AuthService.isAdmin()) {
          event.preventDefault();
          $location.path('/admin-login');
        }
        // Requires citizen login check
        else if (next.requiresAuth && !AuthService.isAuthenticated()) {
          event.preventDefault();
          $location.path('/login');
        }
      });
    },
  ]);
})();
