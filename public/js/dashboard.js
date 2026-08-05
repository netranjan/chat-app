// ==========================
//  Admin Dashboard – Rasuv only
// ==========================

console.log('Dashboard JS v2 loaded');

const modal = document.getElementById('dashModal');
const closeBtn = document.getElementById('closeDash');
const dashboardData = document.getElementById('dashContent');

let dashInterval = null;

// ---------- Helper: format relative time ----------
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

// ---------- Open / Close ----------
function openDash() {
  console.log('openDash called');
  if (!modal) { console.error('dashModal not found'); return; }
  modal.classList.remove('hidden');
  fetchDashboard();
  if (dashInterval) clearInterval(dashInterval);
  dashInterval = setInterval(fetchDashboard, 3000);
}

function closeDash() {
  console.log('closeDash called');
  if (!modal) return;
  modal.classList.add('hidden');
  if (dashInterval) { clearInterval(dashInterval); dashInterval = null; }
}

// Attach to ALL dashboard buttons (desktop + mobile menu)
const dashBtns = document.querySelectorAll('.js-dashboard');
console.log('Found dashboard buttons:', dashBtns.length);
dashBtns.forEach((btn, i) => {
  console.log('Attaching click to button', i);
  btn.addEventListener('click', openDash);
});

if (closeBtn) {
  closeBtn.addEventListener('click', closeDash);
} else {
  console.warn('closeDash button not found');
}

if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeDash();
  });
}

// ---------- Fetch & render ----------
async function fetchDashboard() {
  console.log('fetchDashboard called');
  if (!dashboardData) { console.error('dashContent not found'); return; }
  try {
    const res = await fetch('/status/all');
    console.log('Fetch status:', res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('Fetch data keys:', Object.keys(data));

    const users = [];
    for (const [id, status] of Object.entries(data)) {
      if (status && typeof status === 'object') {
        users.push({
          id: Number(id),
          username: Number(id) === 1 ? 'rasuv' : (Number(id) === 2 ? 'manu' : `user ${id}`),
          ...status
        });
      }
    }

    let html = '';
    users.forEach(u => {
      const statusText = u.isOnline ? 'Online' : 'Offline';
      const dotColor = u.isOnline ? '#22c55e' : '#d1d5db';

      let lastSeenDisplay;
      if (u.isOnline) {
        lastSeenDisplay = 'Online now';
      } else if (u.lastSeen) {
        const lastDate = new Date(u.lastSeen);
        lastSeenDisplay = lastDate.getFullYear() < 2000 ? 'Never' : timeAgo(u.lastSeen);
      } else {
        lastSeenDisplay = '—';
      }

      html += `
        <div style="margin-bottom:1rem;padding:0.75rem;background:#fff;border-radius:0.75rem;border:1px solid #f3f4f6;">
          <h3 style="font-size:1.05rem;font-weight:600;margin-bottom:0.25rem;color:#2563eb;display:flex;align-items:center;gap:0.5rem;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dotColor};"></span>
            ${u.username} – ${statusText}
          </h3>
          <p style="font-size:0.875rem;color:#4b5563;margin-bottom:0.25rem;">Last seen: ${lastSeenDisplay}</p>
      `;

      if (u.isTyping) {
        const since = u.typingUpdatedAt
          ? new Date(u.typingUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
          : 'unknown';
        html += `<p style="color:#ec4899;font-weight:500;font-size:0.875rem;">Typing since: ${since}</p>`;
      }

      if (u.location && u.location.city) {
        const loc = u.location;
        const mapLink = (loc.lat && loc.lng) ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null;
        html += `
          <div style="margin-top:0.5rem;padding:0.5rem;background:#f9fafb;border-radius:0.5rem;font-size:0.875rem;">
            <p style="margin-bottom:0.25rem;">📍 ${loc.city}${loc.district ? ', ' + loc.district : ''}, ${loc.state}, ${loc.country}</p>
            ${loc.isp ? `<p style="font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">🌐 ${loc.isp}</p>` : ''}
            ${mapLink ? `<p style="margin-bottom:0.25rem;"><a href="${mapLink}" target="_blank" style="color:#ec4899;text-decoration:none;font-size:0.75rem;">🔗 View on map</a></p>` : ''}
            ${loc.updatedAt ? `<p style="font-size:0.75rem;color:#9ca3af;">Updated: ${new Date(loc.updatedAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>` : ''}
          </div>
        `;
      } else if (u.location) {
        html += `<p style="font-size:0.75rem;color:#9ca3af;margin-top:0.25rem;">📍 Location data incomplete</p>`;
      }

      if (u.lastSeen && !u.isOnline) {
        const lastDate = new Date(u.lastSeen);
        if (lastDate.getFullYear() >= 2000) {
          const fullTime = lastDate.toLocaleString([], {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
          });
          html += `<p style="font-size:0.75rem;color:#9ca3af;">(${fullTime})</p>`;
        }
      }

      html += `</div>`;
    });

    if (users.length === 0) {
      html = '<p style="color:#6b7280;text-align:center;padding:2rem 0;">No users found.</p>';
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    html += `<p style="font-size:0.75rem;color:#d1d5db;text-align:center;margin-top:0.5rem;">Updated ${now}</p>`;

    dashboardData.innerHTML = html;
    console.log('Dashboard rendered successfully');

  } catch (e) {
    console.error('fetchDashboard error:', e);
    dashboardData.innerHTML = '<p style="color:#dc2626;">Could not load dashboard data.</p>';
  }
}