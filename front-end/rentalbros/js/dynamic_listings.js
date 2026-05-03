function renderDynamicListings() {
  const container = document.getElementById('dynamic-listings-container');
  if (!container) return;

  const adminData = localStorage.getItem('admin_properties');
  let properties = [];
  
  if (adminData) {
    properties = JSON.parse(adminData);
  } else {
    properties = [
      { id: 'mock1', name: 'Luxury PG : Koramangala', location: 'Near Hospital, Restaurants, Shopping Mall, Metro Station', rentMin: 22000, amenities: ['Attached Kitchen', '2 Bathrooms', 'Fully-furnished', 'WiFi'], status: 'live', img: '../public/room_images/6h.webp' },
      { id: 'mock2', name: 'Cozy Stay : Indiranagar', location: 'Close to Metro, Tech Park', rentMin: 15000, amenities: ['Shared Kitchen', '1 Bathroom', 'Semi-furnished', 'WiFi'], status: 'live', img: '../public/room_images/1h.webp' },
      { id: 'mock3', name: 'Premium Suites : HSR Layout', location: 'Prime Location, 24/7 Water', rentMin: 28000, amenities: ['AC', 'Attached Kitchen', 'Fully-furnished', 'Gym'], status: 'live', img: '../public/room_images/2h.webp' }
    ];
  }

  const liveProperties = properties.filter(p => p.status === 'live' || p.status === 'approved');

  if (liveProperties.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748b; font-size: 16px; width: 100%;">No properties currently available.</div>';
    return;
  }

  let html = '';
  liveProperties.forEach((p, idx) => {
    const imgs = ['6h.webp', '1h.jpg', '2h.webp', '3h.jpg', '4h.webp', '5h.webp'];
    const imgSrc = p.img || `../public/room_images/${imgs[idx % imgs.length]}`;
    const amenities = p.amenities && p.amenities.length > 0 ? p.amenities : ['WiFi', 'Furnished'];
    const amenitiesHtml = amenities.slice(0, 4).map(a => `<span style="background:#e2e8f0; color:#475569; padding:4px 8px; border-radius:6px; font-size:12px;">${a}</span>`).join('');
    const rent = p.rentMin ? `Rs. ${p.rentMin.toLocaleString()}/month` : 'Contact for Price';

    html += `
      <div class="listing">
        <img src="${imgSrc}" onerror="this.src='../public/room_images/1h.jpg'">
        <h3 class="title">${p.name}</h3>
        <div class="details" style="display:flex; flex-wrap:wrap; gap:6px; margin:10px 0;">
          ${amenitiesHtml}
        </div>
        <p class="location"><span class="material-icons-outlined" style="font-size:24px; vertical-align:middle;">location_on</span> ${p.location}</p>
        <div class="price-row">
          <span class="price">${rent}</span>
        </div>
        <button class="view-btn" onclick="window.location.href='../../pg_details/index.html?id=${p.id}'">View Details</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderDynamicListings);

// Auto-sync across tabs when Admin approves a property!
window.addEventListener('storage', (e) => {
  if (e.key === 'admin_properties') {
    renderDynamicListings();
  }
});
