// Dashboard for rasuv
const dashBtn = document.getElementById('dashboardToggle');
const modal = document.getElementById('dashboardModal');
const closeBtn = document.getElementById('closeDashboard');
const dashboardData = document.getElementById('dashboardData');

let dashInterval;

dashBtn.addEventListener('click', () => {
  modal.style.display = 'flex';
  fetchDashboard();
  dashInterval = setInterval(fetchDashboard, 3000);
});

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
  clearInterval(dashInterval);
});

async function fetchDashboard() {
  try {
    const res = await fetch('/status/all');
    const users = await res.json();
    let html = '';
    users.forEach(u => {
      html += `<h3>${u.username} (${u.isOnline ? '🟢 Online' : '⚫ Offline'})</h3>`;
      html += `<p>Last seen: ${new Date(u.lastSeen).toLocaleString()}</p>`;
      if (u.isTyping) {
        const since = new Date(u.typingUpdatedAt);
        html += `<p>Typing since: ${since.toLocaleTimeString()}</p>`;
      }
      if (u.currentLocation && u.username === 'manu') {
        html += `<p>Location: ${u.currentLocation.city}, ${u.currentLocation.state}, ${u.currentLocation.country}</p>`;
        html += `<p>ISP: ${u.currentLocation.isp}, IP: ${u.currentLocation.ip}</p>`;
      }
    });
    dashboardData.innerHTML = html;
  } catch(e) {}
}