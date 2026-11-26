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
          requiresCitizen: true,
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
          requiresCitizen: true,
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
    '$rootScope',
    function ($q, $location, $rootScope) {
      return {
        request: function (config) {
          const token = localStorage.getItem('pmc_token');
          if (token && !config.headers.Authorization) {
            config.headers.Authorization = 'Bearer ' + token;
          }
          return config;
        },
        responseError: function (rejection) {
          const reqUrl = (rejection.config && rejection.config.url) || '';
          const isAuthSubmission =
            reqUrl.indexOf('/api/auth/login') !== -1 ||
            reqUrl.indexOf('/api/auth/citizen/login') !== -1 ||
            reqUrl.indexOf('/api/auth/admin/login') !== -1 ||
            reqUrl.indexOf('/api/auth/register') !== -1 ||
            reqUrl.indexOf('/api/auth/verify-otp') !== -1;

          // Clear stale/invalid token on 401 from protected API calls
          if (rejection.status === 401 && !isAuthSubmission) {
            const currentPath = $location.path();
            localStorage.removeItem('pmc_token');
            localStorage.removeItem('pmc_user');
            $rootScope.$broadcast('auth:changed', null);
            if (
              currentPath === '/file-grievance' ||
              currentPath === '/profile' ||
              currentPath === '/admin-dashboard'
            ) {
              $location.path(currentPath === '/admin-dashboard' ? '/admin-login' : '/login');
            }
          }
          return $q.reject(rejection);
        },
      };
    },
  ]);

  // Route security check & session verification on startup
  app.run([
    '$rootScope',
    '$location',
    'AuthService',
    function ($rootScope, $location, AuthService) {
      if (AuthService.isAuthenticated()) {
        AuthService.getMe()
          .then(function (res) {
            if (res.data && res.data.user) {
              localStorage.setItem('pmc_user', JSON.stringify(res.data.user));
              $rootScope.$broadcast('auth:changed', res.data.user);
            }
          })
          .catch(function (err) {
            if (err.status === 401 || err.status === 403) {
              AuthService.logout();
            }
          });
      }

      $rootScope.$on('$routeChangeStart', function (event, next) {
        if (!next) return;

        // Requires admin role check
        if (next.requiresAdmin && !AuthService.isAdmin()) {
          event.preventDefault();
          $location.path(AuthService.isCitizen() ? '/profile' : '/admin-login');
        }
        // Requires verified citizen role check
        else if (next.requiresCitizen && !AuthService.isCitizen()) {
          event.preventDefault();
          $location.path(AuthService.isAdmin() ? '/admin-dashboard' : '/login');
        }
        // General authenticated route check
        else if (next.requiresAuth && !AuthService.isAuthenticated()) {
          event.preventDefault();
          $location.path('/login');
        }
      });
    },
  ]);
})();
