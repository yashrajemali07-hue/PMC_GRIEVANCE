// public/js/services/authService.js - Authentication Service ($http)
(function () {
  'use strict';

  angular.module('pmcApp').factory('AuthService', [
    '$http',
    '$rootScope',
    function ($http, $rootScope) {
      const service = {};

      function parseJwt(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        try {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
          return JSON.parse(atob(padded));
        } catch (e) {
          return null;
        }
      }

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

      service.isTokenValid = function () {
        const token = service.getToken();
        const payload = parseJwt(token);
        if (!payload) return false;
        if (payload.exp && payload.exp * 1000 <= Date.now()) {
          return false;
        }
        return true;
      };

      service.isAuthenticated = function () {
        const token = service.getToken();
        const user = service.getUser();
        if (!token || !user || !service.isTokenValid()) {
          if (token || user) {
            service.logout();
          }
          return false;
        }
        return true;
      };

      service.isAdmin = function () {
        if (!service.isAuthenticated()) return false;
        const user = service.getUser();
        return !!(user && user.role === 'admin');
      };

      service.isCitizen = function () {
        if (!service.isAuthenticated()) return false;
        const user = service.getUser();
        return !!(user && user.role === 'citizen' && user.isVerified !== false);
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
        return $http.post('/api/auth/citizen/login', credentials);
      };

      service.adminLogin = function (credentials) {
        return $http.post('/api/auth/admin/login', credentials);
      };

      service.getMe = function () {
        return $http.get('/api/auth/me');
      };

      return service;
    },
  ]);
})();
