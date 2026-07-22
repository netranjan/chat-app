// Dashboard for rasuv
const dashBtn = document.getElementById('dashboardToggle');
const modal = document.getElementById('dashboardModal');
const closeBtn = document.getElementById('closeDashboard');
const dashboardData = document.getElementById('dashboardData');

let dashInterval;

dashBtn.addEventListener('click', () => {
  // Use the 'active' class so the CSS transition works
  modal.classList.add('active');
  fetchDashboard();
  dashInterval = setInterval(fetchDashboard, 3000);
});

closeBtn.addEventListener('click', () => {
  modal.classList.remove('active');
  clearInterval(dashInterval);
});

// Also close when clicking the dark backdrop (outside the content area)
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('active');
    clearInterval(dashInterval);
  }
});

async function fetchDashboard() {
  try {
    const res = await fetch('/status/all');
    const users = await res.json();
    let html = '';
    users.forEach(u => {
      const onlineClass = u.isOnline ? 'online' : 'offline';
      const statusText = u.isOnline ? 'Online' : 'Offline';
      html += `<h3><span class="status-dot ${onlineClass}"></span> ${u.username} – ${statusText}</h3>`;
      html += `<p>Last seen: ${new Date(u.lastSeen).toLocaleString()}</p>`;
      if (u.isTyping) {
        const since = new Date(u.typingUpdatedAt);
        html += `<p class="typing-active">Typing since: ${since.toLocaleTimeString()}</p>`;
      }
      if (u.currentLocation && u.username === 'manu') {
        html += `<div class="location-details">`;
        html += `<p>📍 ${u.currentLocation.city}, ${u.currentLocation.state}, ${u.currentLocation.country}</p>`;
        html += `<p>🌐 ISP: ${u.currentLocation.isp}, IP: ${u.currentLocation.ip}</p>`;
        html += `</div>`;
      }
    });
    dashboardData.innerHTML = html;
  } catch(e) {
    // silently ignore errors
  }
}