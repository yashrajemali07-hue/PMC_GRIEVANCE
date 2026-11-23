// public/js/controllers/awarenessCtrl.js - Civic Awareness & Guidelines
(function () {
  'use strict';

  angular.module('pmcApp').controller('AwarenessCtrl', [
    '$scope',
    function ($scope) {
      $scope.activeTab = 'waste';

      $scope.helplines = [
        { title: 'PMC Toll-Free Grievance Helpline', number: '1800-1030-222', icon: 'bi-headset' },
        { title: 'Emergency Disaster Management Cell', number: '020-25501269 / 020-25506800', icon: 'bi-shield-exclamation' },
        { title: 'Pune Fire Brigade Control Room', number: '101 / 020-26451707', icon: 'bi-fire' },
        { title: 'Ambulance Emergency Medical Service', number: '108', icon: 'bi-hospital' },
        { title: 'Pune City Police Control Room', number: '112 / 100', icon: 'bi-shield-shaded' },
      ];

      $scope.wardOffices = [
        { name: 'Shivajinagar-Ghole Road', phone: '020-25538561', address: 'Near Balgandharva Rangmandir, Shivajinagar' },
        { name: 'Kothrud-Bavdhan', phone: '020-25381861', address: 'Near Kothrud Stand, Paud Road, Pune' },
        { name: 'Aundh-Baner', phone: '020-25881471', address: 'Opposite Westend Mall, Aundh, Pune' },
        { name: 'Kasba-Vishrambaugwada', phone: '020-24451234', address: 'Appa Balwant Chowk, Shaniwar Peth' },
        { name: 'Hadapsar-Mundhwa', phone: '020-26871141', address: 'Solapur Road, Hadapsar Gadital' },
        { name: 'Yerawada-Kalas-Dhanori', phone: '020-26681021', address: 'Jail Road, Yerawada, Pune' },
      ];
    },
  ]);
})();
