// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  await initPage('dashboard', 'Dashboard', 'Welcome back, here\'s your overview');
  await loadDashboard();
});

async function loadDashboard() {
  const data = await fetchData();
  const { properties = [], issues = [], notifications = [] } = data;

  // Compute stats
  const totalProps = properties.length;
  const totalRooms = properties.reduce((s, p) => s + (p.totalRooms || 0), 0);
  const occupiedRooms = properties.reduce((s, p) => s + (p.occupiedRooms || 0), 0);
  const occupancyPct = totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const monthlyRevenue = properties.reduce((s, p) => s + (p.occupiedRooms || 0) * (p.monthlyRent || 0), 0);
  const openIssues = issues.filter(i => i.status === 'Open').length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const recentIssues = issues.slice(0, 4);
  const activeProps = properties.filter(p => p.status === 'Active');

  document.getElementById('pageContent').innerHTML = `
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon purple">🏢</div>
        <div class="stat-info">
          <div class="stat-value">${totalProps}</div>
          <div class="stat-label">Total Properties</div>
          <div class="stat-change up">↑ ${activeProps.length} active</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🛏</div>
        <div class="stat-info">
          <div class="stat-value">${occupancyPct}%</div>
          <div class="stat-label">Occupancy Rate</div>
          <div class="stat-change ${occupancyPct >= 70 ? 'up' : 'down'}">${occupiedRooms}/${totalRooms} rooms filled</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">💰</div>
        <div class="stat-info">
          <div class="stat-value">${formatCurrency(monthlyRevenue)}</div>
          <div class="stat-label">Monthly Revenue</div>
          <div class="stat-change up">↑ Estimated this month</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">⚠️</div>
        <div class="stat-info">
          <div class="stat-value">${openIssues}</div>
          <div class="stat-label">Open Issues</div>
          <div class="stat-change ${openIssues === 0 ? 'up' : 'down'}">${openIssues === 0 ? 'All clear!' : openIssues + ' need attention'}</div>
        </div>
      </div>
    </div>

    <!-- Two column layout -->
    <div class="grid-2" style="margin-bottom:24px">
      <!-- Recent Issues -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Issues</div>
            <div class="card-subtitle">${issues.length} total issues reported</div>
          </div>
          <a href="issues.html" class="btn btn-secondary btn-sm">View All</a>
        </div>
        ${recentIssues.length === 0 ? `
          <div class="empty-state" style="padding:30px 20px">
            <div class="empty-icon">✅</div>
            <h3>No Issues</h3>
            <p>All properties are running smoothly</p>
          </div>` : recentIssues.map(issue => `
          <div class="issue-card" style="margin-bottom:10px;cursor:pointer" onclick="window.location.href='issues.html'">
            <div class="issue-icon" style="background:${issue.priority === 'High' ? 'var(--danger-bg)' : issue.priority === 'Medium' ? 'var(--warning-bg)' : 'var(--info-bg)'}">
              ${getCategoryIcon(issue.category)}
            </div>
            <div class="issue-body">
              <div class="issue-title" style="font-size:14px">${issue.title}</div>
              <div class="issue-meta">
                <span>${issue.propertyName}</span>
                <span>•</span>
                <span class="badge badge-${issue.status.toLowerCase().replace(' ', '')}">${issue.status}</span>
                <span class="badge badge-${issue.priority.toLowerCase()}">${issue.priority}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Property Overview -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Property Overview</div>
            <div class="card-subtitle">Occupancy breakdown</div>
          </div>
          <a href="properties.html" class="btn btn-secondary btn-sm">Manage</a>
        </div>
        ${properties.length === 0 ? `
          <div class="empty-state" style="padding:30px 20px">
            <div class="empty-icon">🏢</div>
            <h3>No Properties</h3>
            <p><a href="add-property.html" style="color:var(--primary)">Add your first property</a></p>
          </div>` : properties.map(p => {
            const pct = getOccupancyPercent(p.occupiedRooms, p.totalRooms);
            const cls = getOccupancyClass(pct);
            return `
          <div style="margin-bottom:16px">
            <div class="flex-between mb-4">
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text-heading)">${p.name}</div>
                <div style="font-size:12px;color:var(--text-muted)">${p.city} • ${p.type}</div>
              </div>
              <span class="badge badge-${p.status.toLowerCase()}">${p.status}</span>
            </div>
            <div class="occupancy-bar-wrap">
              <div class="occupancy-bar-label">
                <span>${p.occupiedRooms}/${p.totalRooms} rooms</span>
                <span>${pct}%</span>
              </div>
              <div class="occupancy-bar">
                <div class="occupancy-fill ${cls}" style="width:${pct}%"></div>
              </div>
            </div>
          </div>`;
          }).join('')}
      </div>
    </div>

    <!-- Notifications + Quick actions -->
    <div class="grid-2">
      <!-- Notifications -->
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Notifications</div>
            <div class="card-subtitle">${unreadNotifs} unread</div>
          </div>
          <a href="notifications.html" class="btn btn-secondary btn-sm">View All</a>
        </div>
        ${notifications.slice(0, 4).map(n => `
          <div class="notif-card ${!n.read ? 'unread' : ''}" style="margin-bottom:8px;cursor:pointer" onclick="window.location.href='notifications.html'">
            ${!n.read ? '<div class="unread-dot"></div>' : ''}
            <div class="notif-icon" style="background:${getNotifIconBg(n.type)}">${getNotifIcon(n.type)}</div>
            <div class="notif-body">
              <div class="notif-title">${n.title}</div>
              <div class="notif-date">${formatDate(n.date)}</div>
            </div>
          </div>`).join('')}
        ${notifications.length === 0 ? '<p class="text-center text-muted" style="padding:20px">No notifications</p>' : ''}
      </div>

      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">Quick Actions</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <a href="add-property.html" class="btn btn-primary" style="justify-content:flex-start;gap:12px">
            <span>➕</span> Add New Property
          </a>
          <a href="issues.html" class="btn btn-secondary" style="justify-content:flex-start;gap:12px">
            <span>⚠️</span> Manage Issues <span class="nav-badge" style="margin-left:auto;background:var(--danger)">${openIssues}</span>
          </a>
          <a href="policy.html" class="btn btn-secondary" style="justify-content:flex-start;gap:12px">
            <span>📋</span> Review Policy
          </a>
          <a href="notifications.html" class="btn btn-secondary" style="justify-content:flex-start;gap:12px">
            <span>🔔</span> Notifications <span class="nav-badge" style="margin-left:auto">${unreadNotifs}</span>
          </a>
          <a href="profile.html" class="btn btn-secondary" style="justify-content:flex-start;gap:12px">
            <span>👤</span> Update Profile
          </a>
        </div>

        <!-- Summary box -->
        <div style="margin-top:20px;padding:16px;background:var(--primary-light);border-radius:var(--radius-md);border:1px solid #ddd8ff">
          <div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:8px">📊 Monthly Summary</div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-body);margin-bottom:6px">
            <span>Total Tenants</span><span style="font-weight:600">${occupiedRooms}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-body);margin-bottom:6px">
            <span>Vacant Rooms</span><span style="font-weight:600">${totalRooms - occupiedRooms}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-body)">
            <span>Est. Revenue</span><span style="font-weight:700;color:var(--primary)">${formatCurrency(monthlyRevenue)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}