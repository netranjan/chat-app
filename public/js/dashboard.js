// ==========================
//  Admin Dashboard – Rasuv only
// ==========================

const dashBtn = document.getElementById('dashboardToggle');
const modal = document.getElementById('dashboardModal');
const closeBtn = document.getElementById('closeDashboard');
const dashboardData = document.getElementById('dashboardData');

let dashInterval;

dashBtn.addEventListener('click', () => {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  fetchDashboard();
  dashInterval = setInterval(fetchDashboard, 3000);
});

closeBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  clearInterval(dashInterval);
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
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
      html += `<h3 class="text-lg font-semibold mt-4 mb-2 text-blue-600 border-b-2 border-gray-100 pb-1">
                <span class="inline-block w-2.5 h-2.5 rounded-full mr-2 ${u.isOnline ? 'bg-green-500' : 'bg-gray-300'}"></span>
                ${u.username} – ${statusText}
              </h3>`;
      html += `<p class="text-sm text-gray-600 mb-1">Last seen: ${u.lastSeen ? new Date(u.lastSeen).toLocaleString() : '—'}</p>`;
      if (u.isTyping) {
        const since = u.typingUpdatedAt ? new Date(u.typingUpdatedAt).toLocaleTimeString() : 'unknown';
        html += `<p class="text-pink-600 font-medium">Typing since: ${since}</p>`;
      }
      if (u.username === 'manu' && u.currentLocation) {
        const loc = u.currentLocation;
        html += `<div class="bg-gray-50 rounded-xl p-3 mt-2 text-sm text-gray-700">
                  <p class="font-semibold">📍 Location</p>
                  <p>${loc.city || ''}, ${loc.state || ''}, ${loc.country || ''}</p>
                  <p>🌐 ISP: ${loc.isp || '—'}, IP: ${loc.ip || '—'}</p>
                  <p class="text-xs text-gray-400">Last updated: ${loc.updatedAt ? new Date(loc.updatedAt).toLocaleString() : '—'}</p>
                </div>`;
      } else if (u.username === 'manu' && !u.currentLocation) {
        html += `<p class="text-sm text-gray-400 italic mt-1">Waiting for location data…</p>`;
      }
    });
    dashboardData.innerHTML = html || '<p class="text-gray-500">No users found.</p>';
  } catch(e) {
    dashboardData.innerHTML = '<p class="text-red-500">Could not load dashboard data.</p>';
  }
}