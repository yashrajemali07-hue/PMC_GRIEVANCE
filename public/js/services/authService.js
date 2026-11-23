// public/js/services/authService.js - Authentication Service ($http)
(function () {
  'use strict';

  angular.module('pmcApp').factory('AuthService', [
    '$http',
    '$rootScope',
    function ($http, $rootScope) {
      const service = {};

      service.getToken = function () {
        return localStorage.getItem('pmc_token');
      };

      service.getUser = function () {
        const u = localStorage.getItem('pmc_user');
        try {
          return u ? JSON.parse(u) : null;
        } catch (e) {
          return null;
        }
      };

      service.isAuthenticated = function () {
        return !!service.getToken();
      };

      service.isAdmin = function () {
        const user = service.getUser();
        return user && user.role === 'admin';
      };

      service.isCitizen = function () {
        const user = service.getUser();
        return user && user.role === 'citizen';
      };

      service.setAuth = function (token, user) {
        localStorage.setItem('pmc_token', token);
        localStorage.setItem('pmc_user', JSON.stringify(user));
        $rootScope.$broadcast('auth:changed', user);
      };

      service.logout = function () {
        localStorage.removeItem('pmc_token');
        localStorage.removeItem('pmc_user');
        localStorage.removeItem('pmc_pending_email');
        $rootScope.$broadcast('auth:changed', null);
      };

      // API calls
      service.register = function (data) {
        return $http.post('/api/auth/register', data);
      };

      service.verifyOtp = function (data) {
        return $http.post('/api/auth/verify-otp', data);
      };

      service.resendOtp = function (email) {
        return $http.post('/api/auth/resend-otp', { email: email });
      };

      service.login = function (credentials) {
        return $http.post('/api/auth/login', credentials);
      };

      service.adminLogin = function (credentials) {
        return $http.post('/api/auth/login', credentials);
      };

      service.getMe = function () {
        return $http.get('/api/auth/me');
      };

      return service;
    },
  ]);
})();
