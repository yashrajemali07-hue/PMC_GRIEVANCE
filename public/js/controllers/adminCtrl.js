// public/js/controllers/adminCtrl.js - PMC Admin Dashboard & Analytics Controller
(function () {
  'use strict';

  angular.module('pmcApp').controller('AdminDashboardCtrl', [
    '$scope',
    '$timeout',
    'AdminService',
    'GrievanceService',
    function ($scope, $timeout, AdminService, GrievanceService) {
      $scope.loading = true;
      $scope.stats = null;
      $scope.grievances = [];
      $scope.total = 0;
      $scope.page = 1;
      $scope.pages = 1;
      $scope.wards = [];
      $scope.categories = [];
      $scope.statuses = ['Submitted', 'In Progress', 'Resolved', 'Rejected'];
      $scope.priorities = ['High', 'Medium', 'Low'];

      // Active filters
      $scope.filters = {
        status: '',
        category: '',
        ward: '',
        priority: '',
        search: '',
        page: 1,
      };

      // Modal state for status patch
      $scope.selectedGrievance = null;
      $scope.patchForm = {
        status: '',
        assignedOfficer: '',
        remarks: '',
      };
      $scope.patching = false;
      $scope.modalMsg = null;
      $scope.modalErr = null;

      // Load metadata
      GrievanceService.getMetadata().then(function (res) {
        if (res.data && res.data.data) {
          $scope.wards = res.data.data.wards || [];
          $scope.categories = res.data.data.categories || [];
        }
      });

      // Load statistics & render charts
      $scope.loadStats = function () {
        AdminService.getStats().then(function (res) {
          if (res.data && res.data.stats) {
            $scope.stats = res.data.stats;
            $timeout(function () {
              renderCharts(res.data.stats);
            }, 200);
          }
        });
      };

      // Load grievances with filters
      $scope.loadGrievances = function () {
        $scope.loading = true;
        AdminService.getGrievances($scope.filters)
          .then(function (res) {
            $scope.grievances = res.data.grievances || [];
            $scope.total = res.data.total || 0;
            $scope.page = res.data.page || 1;
            $scope.pages = res.data.pages || 1;
          })
          .finally(function () {
            $scope.loading = false;
          });
      };

      // Apply filter
      $scope.applyFilter = function () {
        $scope.filters.page = 1;
        $scope.loadGrievances();
      };

      // Clear filters
      $scope.clearFilter = function () {
        $scope.filters = {
          status: '',
          category: '',
          ward: '',
          priority: '',
          search: '',
          page: 1,
        };
        $scope.loadGrievances();
      };

      // Pagination
      $scope.changePage = function (p) {
        if (p < 1 || p > $scope.pages) return;
        $scope.filters.page = p;
        $scope.loadGrievances();
      };

      // Open status modal
      $scope.openStatusModal = function (g) {
        $scope.selectedGrievance = g;
        $scope.patchForm = {
          status: g.status,
          assignedOfficer: g.assignedOfficer || '',
          remarks: '',
        };
        $scope.modalMsg = null;
        $scope.modalErr = null;

        const modalElem = document.getElementById('statusModal');
        if (modalElem && typeof bootstrap !== 'undefined') {
          const bsModal = bootstrap.Modal.getOrCreateInstance(modalElem);
          bsModal.show();
        }
      };

      // Submit Status Patch with optional resolution photo
      $scope.submitStatusPatch = function () {
        if (!$scope.selectedGrievance) return;
        $scope.patching = true;
        $scope.modalMsg = null;
        $scope.modalErr = null;

        const fd = new FormData();
        fd.append('status', $scope.patchForm.status);
        if ($scope.patchForm.assignedOfficer) fd.append('assignedOfficer', $scope.patchForm.assignedOfficer);
        if ($scope.patchForm.remarks) fd.append('remarks', $scope.patchForm.remarks);

        const photoInput = document.getElementById('resolutionPhotoInput');
        if (photoInput && photoInput.files && photoInput.files[0]) {
          fd.append('resolutionPhoto', photoInput.files[0]);
        }

        AdminService.patchStatus($scope.selectedGrievance.grievanceId, fd)
          .then(function (res) {
            $scope.modalMsg = res.data.message;
            $scope.loadGrievances();
            $scope.loadStats();
            $timeout(function () {
              const modalElem = document.getElementById('statusModal');
              if (modalElem && typeof bootstrap !== 'undefined') {
                const bsModal = bootstrap.Modal.getInstance(modalElem);
                if (bsModal) bsModal.hide();
              }
            }, 1200);
          })
          .catch(function (err) {
            $scope.modalErr = (err.data && err.data.message) || 'Failed to update status.';
          })
          .finally(function () {
            $scope.patching = false;
          });
      };

      // Delete grievance
      $scope.deleteGrievance = function (g) {
        if (!confirm(`Are you sure you want to delete grievance ${g.grievanceId}?`)) return;

        AdminService.deleteGrievance(g.grievanceId).then(function () {
          $scope.loadGrievances();
          $scope.loadStats();
        });
      };

      let statusChart = null;
      let categoryChart = null;

      // Clean up Chart.js instances on route leave
      $scope.$on('$destroy', function () {
        if (statusChart) {
          statusChart.destroy();
          statusChart = null;
        }
        if (categoryChart) {
          categoryChart.destroy();
          categoryChart = null;
        }
      });

      function renderCharts(stats) {
        if (typeof Chart === 'undefined') return;

        // 1. Status Chart (Doughnut)
        const statusCtx = document.getElementById('statusChartCanvas');
        if (statusCtx && stats.byStatus) {
          if (statusChart) statusChart.destroy();
          statusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
              labels: ['Submitted', 'In Progress', 'Resolved', 'Rejected'],
              datasets: [
                {
                  data: [
                    stats.byStatus['Submitted'] || 0,
                    stats.byStatus['In Progress'] || 0,
                    stats.byStatus['Resolved'] || 0,
                    stats.byStatus['Rejected'] || 0,
                  ],
                  backgroundColor: ['#0d6efd', '#ffc107', '#198754', '#6c757d'],
                },
              ],
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'bottom' } },
            },
          });
        }

        // 2. Category Chart (Bar)
        const catCtx = document.getElementById('categoryChartCanvas');
        if (catCtx && stats.byCategory && stats.byCategory.length > 0) {
          if (categoryChart) categoryChart.destroy();
          categoryChart = new Chart(catCtx, {
            type: 'bar',
            data: {
              labels: stats.byCategory.map((item) => item.category),
              datasets: [
                {
                  label: 'Complaints',
                  data: stats.byCategory.map((item) => item.count),
                  backgroundColor: '#0b5ed7',
                  borderRadius: 6,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
            },
          });
        }
      }

      // Initial load
      $scope.loadStats();
      $scope.loadGrievances();
    },
  ]);
})();
