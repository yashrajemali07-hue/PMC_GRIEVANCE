// public/js/controllers/homeCtrl.js - Home Page & Interactive Leaflet Map
(function () {
  'use strict';

  angular.module('pmcApp').controller('HomeCtrl', [
    '$scope',
    '$timeout',
    'GrievanceService',
    function ($scope, $timeout, GrievanceService) {
      $scope.loading = true;
      $scope.stats = {
        totalGrievances: 0,
        resolvedGrievances: 0,
        inProgressGrievances: 0,
        activeCitizens: 0,
        resolutionRate: '0%',
      };
      $scope.recentGrievances = [];

      // Fetch public portal stats
      GrievanceService.getPublicStats()
        .then(function (res) {
          if (res.data && res.data.stats) {
            $scope.stats = res.data.stats;
            $scope.recentGrievances = res.data.recentGrievances || [];
          }
        })
        .finally(function () {
          $scope.loading = false;
        });

      // Initialize Leaflet Map
      let map = null;

      function initMap(mapData) {
        const mapContainer = document.getElementById('leafletHomeMap');
        if (!mapContainer || typeof L === 'undefined') return;

        // Centered on Pune Municipal Corporation Main Bhavan, Shivajinagar
        const puneCenter = [18.5204, 73.8567];

        if (!map) {
          map = L.map('leafletHomeMap').setView(puneCenter, 12);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors | Pune Municipal Corporation',
            maxZoom: 18,
          }).addTo(map);
        }

        // Color helper for priority markers
        function getPriorityColor(priority) {
          if (priority === 'High') return '#dc3545'; // Red
          if (priority === 'Medium') return '#fd7e14'; // Orange
          return '#0dcaf0'; // Cyan/Blue
        }

        // Plot colored markers
        if (mapData && mapData.length > 0) {
          mapData.forEach(function (g) {
            if (g.lat && g.lng) {
              const color = getPriorityColor(g.priority);
              const circleMarker = L.circleMarker([g.lat, g.lng], {
                radius: 9,
                fillColor: color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
              }).addTo(map);

              const popupContent = `
                <div style="font-family: inherit; min-width: 200px; padding: 2px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #0b5ed7; font-size: 13px;">${g.grievanceId || 'Grievance'}</strong>
                    <span class="badge" style="background: ${color}; color: #fff; font-size: 10px; padding: 3px 6px;">${g.priority} Priority</span>
                  </div>
                  <div style="font-size: 12px; margin-bottom: 4px;">
                    <strong>Category:</strong> ${g.category}
                  </div>
                  <div style="margin-top: 8px;">
                    <a href="#/track/${encodeURIComponent(g.grievanceId)}" class="btn btn-sm btn-primary w-100 py-1" style="font-size: 12px; color: #fff; font-weight: 600;">
                      <i class="bi bi-search me-1"></i> Track Status
                    </a>
                  </div>
                </div>
              `;
              circleMarker.bindPopup(popupContent);
            }
          });
        }

        // Invalidate map size after DOM animation finishes to prevent gray tiles
        $timeout(function () {
          if (map) map.invalidateSize();
        }, 350);
      }

      // Cleanup map on view destroy
      $scope.$on('$destroy', function () {
        if (map) {
          map.remove();
          map = null;
        }
      });

      // Load map data
      $timeout(function () {
        GrievanceService.getMapGrievances()
          .then(function (res) {
            const data = (res.data && res.data.data) || (res.data && res.data.grievances) || [];
            initMap(data);
          })
          .catch(function () {
            initMap([]);
          });
      }, 200);
    },
  ]);
})();
