// public/js/controllers/authCtrl.js - Registration, Verification, Login & Admin Login
(function () {
  'use strict';

  angular.module('pmcApp').controller('AuthCtrl', [
    '$scope',
    '$location',
    'AuthService',
    'GrievanceService',
    function ($scope, $location, AuthService, GrievanceService) {
      $scope.wards = [];
      $scope.errorMsg = null;
      $scope.successMsg = null;
      $scope.submitting = false;

      // Registration Form
      $scope.regData = {
        name: '',
        email: '',
        password: '',
        ward: '',
        phone: '',
      };

      // OTP Verification Form
      $scope.otpData = {
        email: localStorage.getItem('pmc_pending_email') || '',
        otp: '',
      };

      // Citizen Login Form
      $scope.loginData = {
        email: '',
        password: '',
      };

      // Admin Login Form
      $scope.adminData = {
        username: 'admin',
        password: '',
      };

      // Password visibility toggle
      $scope.showPassword = false;
      $scope.togglePasswordVisibility = function () {
        $scope.showPassword = !$scope.showPassword;
      };

      // Quick Demo Fill helpers for testing & presentations
      $scope.fillDemoCitizen = function () {
        $scope.loginData.email = 'citizen@example.com';
        $scope.loginData.password = 'Password123!';
      };

      $scope.fillDemoCitizenPhone = function () {
        $scope.loginData.email = '9822012345';
        $scope.loginData.password = 'Password123!';
      };

      $scope.fillDemoAdmin = function () {
        $scope.adminData.username = 'admin';
        $scope.adminData.password = 'adminPMC@2026';
      };

      // OTP Countdown Timer (10 minutes)
      $scope.otpTimer = 600;
      $scope.formattedTimer = '10:00';
      let timerInterval = null;

      function startOtpCountdown() {
        $scope.otpTimer = 600;
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function () {
          $scope.$apply(function () {
            if ($scope.otpTimer > 0) {
              $scope.otpTimer--;
              const mins = Math.floor($scope.otpTimer / 60);
              const secs = $scope.otpTimer % 60;
              $scope.formattedTimer = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
            } else {
              clearInterval(timerInterval);
              $scope.formattedTimer = 'Expired';
            }
          });
        }, 1000);
      }

      if ($location.path() === '/verify-otp') {
        startOtpCountdown();
      }

      $scope.$on('$destroy', function () {
        if (timerInterval) clearInterval(timerInterval);
      });

      // Load Pune wards from API
      GrievanceService.getMetadata()
        .then(function (res) {
          if (res.data && res.data.data && res.data.data.wards) {
            $scope.wards = res.data.data.wards;
          }
        })
        .catch(function () {
          $scope.wards = [
            'Aundh-Baner',
            'Kothrud-Bavdhan',
            'Shivajinagar-Ghole Road',
            'Kasba-Vishrambaugwada',
            'Bhavani Peth',
            'Bibwewadi',
            'Dhankawadi-Sahakarnagar',
            'Hadapsar-Mundhwa',
            'Kondhwa-Yewalewadi',
            'Nagar Road-Vadgaonsheri',
            'Sinhagad Road',
            'Warje-Karvenagar',
            'Wanowrie-Ramtekdi',
            'Yerawada-Kalas-Dhanori',
          ];
        });

      // 1. Submit Registration
      $scope.doRegister = function () {
        $scope.errorMsg = null;

        const name = ($scope.regData.name || '').trim();
        const email = ($scope.regData.email || '').trim();
        const password = $scope.regData.password || '';
        const ward = ($scope.regData.ward || '').trim();
        const phone = ($scope.regData.phone || '').replace(/[\s\-()]/g, '').replace(/^\+91/, '');

        if (name.length < 2) {
          $scope.errorMsg = 'Please enter your full name (at least 2 characters).';
          return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          $scope.errorMsg = 'Please enter a valid email address.';
          return;
        }
        if (password.length < 6) {
          $scope.errorMsg = 'Password must be at least 6 characters long.';
          return;
        }
        if (!ward) {
          $scope.errorMsg = 'Please select your PMC ward office.';
          return;
        }
        if (phone && !/^[6-9]\d{9}$/.test(phone)) {
          $scope.errorMsg = 'Please enter a valid 10-digit Indian mobile number starting with 6-9.';
          return;
        }

        $scope.submitting = true;

        AuthService.register({
          name: name,
          email: email,
          password: password,
          ward: ward,
          phone: phone,
        })
          .then(function (res) {
            localStorage.setItem('pmc_pending_email', email);
            $location.path('/verify-otp');
          })
          .catch(function (err) {
            $scope.errorMsg = (err.data && err.data.message) || 'Registration failed. Please try again.';
          })
          .finally(function () {
            $scope.submitting = false;
          });
      };

      // 2. Submit OTP Verification
      $scope.doVerifyOtp = function () {
        $scope.errorMsg = null;
        $scope.successMsg = null;

        const email = ($scope.otpData.email || '').trim();
        const otp = ($scope.otpData.otp || '').trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          $scope.errorMsg = 'Please provide the registered email address for verification.';
          return;
        }
        if (!/^\d{6}$/.test(otp)) {
          $scope.errorMsg = 'Please enter a valid 6-digit numeric OTP.';
          return;
        }

        $scope.submitting = true;

        AuthService.verifyOtp({ email: email, otp: otp })
          .then(function (res) {
            localStorage.removeItem('pmc_pending_email');
            if (res.data && res.data.token && res.data.user) {
              AuthService.setAuth(res.data.token, res.data.user);
              $location.path('/profile');
            } else {
              $location.path('/login');
            }
          })
          .catch(function (err) {
            $scope.errorMsg = (err.data && err.data.message) || 'Invalid or expired OTP.';
          })
          .finally(function () {
            $scope.submitting = false;
          });
      };

      // Resend OTP
      $scope.resendOtp = function () {
        const email = ($scope.otpData.email || '').trim();
        if (!email) {
          $scope.errorMsg = 'Please enter your registered email address first.';
          return;
        }
        $scope.errorMsg = null;
        $scope.successMsg = null;

        AuthService.resendOtp(email)
          .then(function (res) {
            $scope.successMsg = 'A fresh 6-digit verification code has been dispatched to your email.';
            startOtpCountdown();
          })
          .catch(function (err) {
            $scope.errorMsg = (err.data && err.data.message) || 'Failed to resend OTP.';
          });
      };

      // 3. Citizen Login
      $scope.doLogin = function () {
        $scope.errorMsg = null;

        const identifier = ($scope.loginData.email || '').trim();
        const password = $scope.loginData.password || '';
        if (!identifier || !password) {
          $scope.errorMsg = 'Please enter your email/mobile number and password.';
          return;
        }

        $scope.submitting = true;

        AuthService.login({ email: identifier, password: password })
          .then(function (res) {
            if (!res.data || !res.data.user || res.data.user.role !== 'citizen') {
              $scope.errorMsg = 'Officer accounts must sign in through the Officer Portal.';
              return;
            }
            AuthService.setAuth(res.data.token, res.data.user);
            $location.path('/profile');
          })
          .catch(function (err) {
            if (err.data && err.data.requiresVerification) {
              localStorage.setItem('pmc_pending_email', err.data.email || identifier);
              $location.path('/verify-otp');
            } else {
              $scope.errorMsg = (err.data && err.data.message) || 'Invalid email/phone or password.';
            }
          })
          .finally(function () {
            $scope.submitting = false;
          });
      };

      // 4. Admin Login
      $scope.doAdminLogin = function () {
        $scope.errorMsg = null;

        const username = ($scope.adminData.username || '').trim();
        const password = $scope.adminData.password || '';
        if (!username || !password) {
          $scope.errorMsg = 'Please enter your administrator username/email and password.';
          return;
        }

        $scope.submitting = true;

        AuthService.adminLogin({ username: username, password: password })
          .then(function (res) {
            if (!res.data || !res.data.user || res.data.user.role !== 'admin') {
              $scope.errorMsg = 'Access denied: Administrator privileges required.';
              return;
            }
            AuthService.setAuth(res.data.token, res.data.user);
            $location.path('/admin-dashboard');
          })
          .catch(function (err) {
            $scope.errorMsg = (err.data && err.data.message) || 'Invalid administrator credentials.';
          })
          .finally(function () {
            $scope.submitting = false;
          });
      };
    },
  ]);
})();
