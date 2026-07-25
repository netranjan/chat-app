// ==========================
//  Admin Dashboard – Rasuv only
// ==========================

const dashBtn = document.getElementById('dashboardToggle');
const modal = document.getElementById('dashboardModal');
const closeBtn = document.getElementById('closeDashboard');
const dashboardData = document.getElementById('dashboardData');

let dashInterval;

// ---------- Helper: format relative time for "last seen" ----------
function timeAgo(date) {
  if (!date) return 'Unknown';
  const now = new Date();
  const then = new Date(date);
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------- Dashboard UI ----------
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

// ---------- Fetch and render ----------
async function fetchDashboard() {
  try {
    const res = await fetch('/status/all');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const users = Array.isArray(data) ? data : (data.users || []);

    let html = '';
    users.forEach(u => {
      const onlineClass = u.isOnline ? 'online' : 'offline';
      const statusText = u.isOnline ? 'Online' : 'Offline';

      let lastSeenDisplay;
      if (u.isOnline) {
        lastSeenDisplay = 'Online now';
      } else if (u.lastSeen) {
        lastSeenDisplay = timeAgo(u.lastSeen);
      } else {
        lastSeenDisplay = '—';
      }

      html += `<div class="mb-4 p-3 bg-white rounded-xl border border-gray-100">
        <h3 class="text-lg font-semibold mb-1 text-blue-600 flex items-center gap-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-gray-300'}"></span>
          ${u.username} – ${statusText}
        </h3>
        <p class="text-sm text-gray-600 mb-1">Last seen: ${lastSeenDisplay}</p>`;

      if (u.isTyping) {
        const since = u.typingUpdatedAt
          ? new Date(u.typingUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : 'unknown';
        html += `<p class="text-pink-600 font-medium text-sm">Typing since: ${since}</p>`;
      }

      // 🆕 Location section (if available)
      if (u.currentLocation && u.currentLocation.city) {
        const loc = u.currentLocation;
        const mapLink = (loc.lat && loc.lng)
          ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}`
          : null;

        html += `
          <div class="mt-2 p-2 bg-gray-50 rounded-lg text-sm space-y-1">
            <p><i class="fas fa-map-marker-alt text-pink-500 w-4 inline-block"></i> ${loc.city}${loc.district ? ', ' + loc.district : ''}, ${loc.state}, ${loc.country}</p>
            ${loc.isp ? `<p class="text-xs text-gray-500"><i class="fas fa-network-wired w-4 inline-block"></i> ${loc.isp}</p>` : ''}
            ${mapLink ? `<p><a href="${mapLink}" target="_blank" class="text-pink-500 hover:underline text-xs"><i class="fas fa-external-link-alt w-4 inline-block"></i> View on map</a></p>` : ''}
            ${loc.updatedAt ? `<p class="text-xs text-gray-400">Updated: ${new Date(loc.updatedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>` : ''}
          </div>`;
      }

      if (u.lastSeen && !u.isOnline) {
        const fullTime = new Date(u.lastSeen).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        html += `<p class="text-xs text-gray-400" title="${fullTime}">(${fullTime})</p>`;
      }

      html += `</div>`;
    });

    if (users.length === 0) {
      html = '<p class="text-gray-500 text-center py-8">No users found.</p>';
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    html += `<p class="text-xs text-gray-300 text-center mt-2">Updated ${now}</p>`;

    dashboardData.innerHTML = html;

  } catch (e) {
    dashboardData.innerHTML = '<p class="text-red-500">Could not load dashboard data.</p>';
  }
}