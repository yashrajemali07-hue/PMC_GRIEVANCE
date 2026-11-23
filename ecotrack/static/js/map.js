/**
 * Renders complaint markers with priority colors and optional heatmap density.
 */
function initComplaintMap(enableHeatmap = false) {
  const mapEl = document.getElementById('complaint-map');
  if (!mapEl) return;

  const defaultCenter = [19.2183, 73.0855];
  const map = L.map(mapEl).setView(defaultCenter, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const priorityColors = { High: '#dc3545', Medium: '#f0a500', Low: '#1a7a3c' };
  const makeCircleIcon = (color) => L.divIcon({
    className: 'eco-map-marker',
    html: `<span style="background:${color};"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  fetch('/map_data')
    .then((r) => r.json())
    .then((complaints) => {
      const bounds = [];
      const heatPoints = [];

      complaints.forEach((complaint) => {
        const lat = parseFloat(complaint.latitude);
        const lng = parseFloat(complaint.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;

        bounds.push([lat, lng]);
        heatPoints.push([lat, lng, complaint.priority === 'High' ? 0.9 : 0.45]);

        const priority = complaint.priority || 'Low';
        const image = complaint.image_url
          ? `<img src="${complaint.image_url}" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:8px;" alt="Complaint image">`
          : '';

        const popup = `
          <div class="map-popup">
            ${image}
            <strong>${complaint.complaint_id}</strong>
            <div>${complaint.issue_type}</div>
            <small>${complaint.address || ''}</small>
            <div class="mt-2">
              <span class="map-pill">${complaint.status}</span>
              <span class="map-pill" style="background:${priorityColors[priority]};color:#fff;">${priority}</span>
            </div>
          </div>
        `;

        L.marker([lat, lng], { icon: makeCircleIcon(priorityColors[priority] || priorityColors.Low) })
          .addTo(map)
          .bindPopup(popup);
      });

      if (enableHeatmap && window.L.heatLayer && heatPoints.length) {
        L.heatLayer(heatPoints, { radius: 28, blur: 22, maxZoom: 17 }).addTo(map);
      }
      if (bounds.length) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        L.marker(defaultCenter, { icon: makeCircleIcon('#1a7a3c') }).addTo(map).bindPopup('No complaints yet');
      }
    })
    .catch((err) => console.warn('PMC complaint map: could not load complaints', err));
}

window.initComplaintMap = initComplaintMap;
