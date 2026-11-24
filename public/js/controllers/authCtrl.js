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
        otp: localStorage.getItem('pmc_dev_otp') || '',
      };
      $scope.devOtp = localStorage.getItem('pmc_dev_otp') || null;

      $scope.autoFillOtp = function () {
        if ($scope.devOtp) {
          $scope.otpData.otp = $scope.devOtp;
        }
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
        $scope.submitting = true;

        AuthService.register($scope.regData)
          .then(function (res) {
            localStorage.setItem('pmc_pending_email', $scope.regData.email);
            if (res.data && res.data.devOtp) {
              localStorage.setItem('pmc_dev_otp', res.data.devOtp);
            }
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
        $scope.submitting = true;

        AuthService.verifyOtp($scope.otpData)
          .then(function (res) {
            localStorage.removeItem('pmc_dev_otp');
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
        if (!$scope.otpData.email) return;
        $scope.errorMsg = null;
        $scope.successMsg = null;

        AuthService.resendOtp($scope.otpData.email)
          .then(function (res) {
            $scope.successMsg = 'A fresh 6-digit OTP has been generated.';
            startOtpCountdown();
            if (res.data && res.data.devOtp) {
              $scope.devOtp = res.data.devOtp;
              $scope.otpData.otp = res.data.devOtp;
              localStorage.setItem('pmc_dev_otp', res.data.devOtp);
            }
          })
          .catch(function (err) {
            $scope.errorMsg = (err.data && err.data.message) || 'Failed to resend OTP.';
          });
      };

      // 3. Citizen Login
      $scope.doLogin = function () {
        $scope.errorMsg = null;
        $scope.submitting = true;

        AuthService.login($scope.loginData)
          .then(function (res) {
            AuthService.setAuth(res.data.token, res.data.user);
            if (res.data.user && res.data.user.role === 'admin') {
              $location.path('/admin-dashboard');
            } else {
              $location.path('/profile');
            }
          })
          .catch(function (err) {
            if (err.data && err.data.requiresVerification) {
              localStorage.setItem('pmc_pending_email', err.data.email || $scope.loginData.email);
              if (err.data.devOtp) {
                localStorage.setItem('pmc_dev_otp', err.data.devOtp);
              }
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
        $scope.submitting = true;

        AuthService.adminLogin($scope.adminData)
          .then(function (res) {
            AuthService.setAuth(res.data.token, res.data.user);
            if (res.data.user && res.data.user.role === 'citizen') {
              $location.path('/profile');
            } else {
              $location.path('/admin-dashboard');
            }
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
