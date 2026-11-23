// public/js/controllers/fileGrievanceCtrl.js - File Grievance with Map Location Picker & Photo Upload
(function () {
  'use strict';

  angular.module('pmcApp').controller('FileGrievanceCtrl', [
    '$scope',
    '$timeout',
    'GrievanceService',
    'AuthService',
    function ($scope, $timeout, GrievanceService, AuthService) {
      $scope.user = AuthService.getUser();
      $scope.wards = [];
      $scope.categories = [];
      $scope.submitting = false;
      $scope.locating = false;
      $scope.errorMsg = null;
      $scope.geoNotice = null;
      $scope.submittedGrievance = null;
      $scope.duplicateWarning = null;

      $scope.form = {
        title: '',
        category: '',
        ward: ($scope.user && $scope.user.ward) || '',
        address: '',
        description: '',
        priority: '',
        lat: null,
        lng: null,
      };

      // Fetch categories & wards
      GrievanceService.getMetadata().then(function (res) {
        if (res.data && res.data.data) {
          $scope.wards = res.data.data.wards || [];
          $scope.categories = res.data.data.categories || [];
        }
      });

      // Initialize Leaflet Map Location Pin Picker
      let pickerMap = null;
      let marker = null;

      $timeout(function () {
        const pickerElem = document.getElementById('leafletPickerMap');
        if (!pickerElem || typeof L === 'undefined') return;

        const puneCenter = [18.5204, 73.8567];
        pickerMap = L.map('leafletPickerMap').setView(puneCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap | Click on map or use GPS button',
          maxZoom: 18,
        }).addTo(pickerMap);

        // Ensure tiles load properly after container finishes rendering
        $timeout(function () {
          if (pickerMap) pickerMap.invalidateSize();
        }, 400);

        // Click event on map to set coordinates
        pickerMap.on('click', function (e) {
          const lat = parseFloat(e.latlng.lat.toFixed(6));
          const lng = parseFloat(e.latlng.lng.toFixed(6));

          $scope.$apply(function () {
            $scope.form.lat = lat;
            $scope.form.lng = lng;
            $scope.geoNotice = `Location pinned: ${lat}, ${lng}`;
          });

          if (marker) {
            marker.setLatLng(e.latlng);
          } else {
            marker = L.marker(e.latlng).addTo(pickerMap);
          }
          marker.bindPopup(`<strong>Selected Issue Location</strong><br/>Lat: ${lat}<br/>Lng: ${lng}`).openPopup();
        });

        // Cleanup map instance on route destroy
        $scope.$on('$destroy', function () {
          if (pickerMap) {
            pickerMap.remove();
            pickerMap = null;
          }
        });
      }, 300);

      // "Use My Location" GPS Button
      $scope.useMyLocation = function () {
        if (!navigator.geolocation) {
          $scope.geoNotice = 'Geolocation is not supported by your current browser.';
          return;
        }

        $scope.locating = true;
        $scope.geoNotice = null;

        navigator.geolocation.getCurrentPosition(
          function (position) {
            $scope.$apply(function () {
              $scope.locating = false;
              const lat = parseFloat(position.coords.latitude.toFixed(6));
              const lng = parseFloat(position.coords.longitude.toFixed(6));
              $scope.form.lat = lat;
              $scope.form.lng = lng;

              if (pickerMap) {
                pickerMap.setView([lat, lng], 16);
                if (marker) {
                  marker.setLatLng([lat, lng]);
                } else {
                  marker = L.marker([lat, lng]).addTo(pickerMap);
                }
                marker.bindPopup(`<strong>Your Current Location</strong><br/>Lat: ${lat}<br/>Lng: ${lng}`).openPopup();
              }
              $scope.geoNotice = `GPS location detected: ${lat}, ${lng}`;
            });
          },
          function (err) {
            $scope.$apply(function () {
              $scope.locating = false;
              $scope.geoNotice = 'Could not access device location. Please allow browser location access or click on the map to set location.';
            });
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      };

      // File Grievance form submit
      $scope.submitGrievance = function () {
        $scope.errorMsg = null;
        $scope.submitting = true;

        const fd = new FormData();
        fd.append('title', $scope.form.title);
        fd.append('category', $scope.form.category);
        fd.append('ward', $scope.form.ward);
        fd.append('address', $scope.form.address);
        fd.append('description', $scope.form.description);
        if ($scope.form.priority) fd.append('priority', $scope.form.priority);
        if ($scope.form.lat !== null) fd.append('lat', $scope.form.lat);
        if ($scope.form.lng !== null) fd.append('lng', $scope.form.lng);

        // File attachment from HTML file input
        const fileInput = document.getElementById('grievanceImageInput');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          fd.append('image', fileInput.files[0]);
        }

        GrievanceService.createGrievance(fd)
          .then(function (res) {
            $scope.submittedGrievance = res.data.grievance;
            $scope.duplicateWarning = res.data.duplicateWarning;
          })
          .catch(function (err) {
            if (err.data && err.data.errors) {
              $scope.errorMsg = err.data.errors.join(' | ');
            } else {
              $scope.errorMsg = (err.data && err.data.message) || 'Failed to file grievance.';
            }
          })
          .finally(function () {
            $scope.submitting = false;
          });
      };

      $scope.resetForm = function () {
        $scope.submittedGrievance = null;
        $scope.duplicateWarning = null;
        $scope.geoNotice = null;
        $scope.form = {
          title: '',
          category: '',
          ward: ($scope.user && $scope.user.ward) || '',
          address: '',
          description: '',
          priority: '',
          lat: null,
          lng: null,
        };
        if (marker && pickerMap) {
          pickerMap.removeLayer(marker);
          marker = null;
        }
      };
    },
  ]);
})();
