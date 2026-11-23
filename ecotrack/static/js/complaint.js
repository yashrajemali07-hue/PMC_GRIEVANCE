/**
 * complaint.js - Handles complaint form: image preview, map picker, validation
 */

let pickMap;
let pickMarker;
let pickCircle;

function previewImage(input) {
  const preview = document.getElementById('imagePreview');
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function initPickMap() {
  const defaultLat = 19.2183;
  const defaultLng = 73.0855;

  pickMap = L.map('pick-map').setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(pickMap);

  pickMap.on('click', function (event) {
    setMarker(event.latlng.lat, event.latlng.lng);
  });
}

function setMarker(lat, lng) {
  const pos = {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
  };

  if (!pickMarker) {
    pickMarker = L.marker([pos.lat, pos.lng], { draggable: true }).addTo(pickMap);
    pickMarker.on('dragend', function (event) {
      const updated = event.target.getLatLng();
      setMarker(updated.lat, updated.lng);
    });
  } else {
    pickMarker.setLatLng([pos.lat, pos.lng]);
  }

  if (!pickCircle) {
    pickCircle = L.circleMarker([pos.lat, pos.lng], {
      radius: 18,
      color: '#1a7a3c',
      weight: 2,
      fillColor: '#2ecc71',
      fillOpacity: 0.15,
    }).addTo(pickMap);
  } else {
    pickCircle.setLatLng([pos.lat, pos.lng]);
  }

  pickMap.setView([pos.lat, pos.lng], Math.max(pickMap.getZoom(), 15));
  document.getElementById('lat-display').value = pos.lat;
  document.getElementById('lng-display').value = pos.lng;
  document.getElementById('latitude').value = pos.lat;
  document.getElementById('longitude').value = pos.lng;
}

function useMyLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      setMarker(pos.coords.latitude, pos.coords.longitude);
    },
    function () {
      alert('Unable to get your location. Please allow location access.');
    }
  );
}

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('complaintForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
    }
    form.classList.add('was-validated');
  });

  const phoneInput = form.querySelector('input[name="phone"]');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });
  }
});

window.initPickMap = initPickMap;
