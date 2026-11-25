import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardenData } from '../utils/dataStore';

function StatCard({ icon, color, label, value, sub, materialIcon }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <span className="material-icons-outlined" style={{ fontSize: '32px' }}>{materialIcon}</span>
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function ComplaintsChart({ complaints = [] }) {
  const catCounts = {};
  complaints.forEach(c => {
    let cat = c.category || c.type || 'General';
    cat = cat.charAt(0).toUpperCase() + cat.slice(1);
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  let data = Object.entries(catCounts).map(([label, val]) => ({ label, val }));
  if (data.length === 0) {
    data = [{ label: 'General', val: 0 }];
  }

  const max = Math.max(...data.map(d => d.val), 1);

  return (
    <div className="chart-card">
      <h3>Complaints &amp; Issues by Type</h3>
      <div className="bar-chart" id="bar-chart-canvas">
        {data.map(d => (
          <div key={d.label} className="bar-group">
            <div className="bar" style={{ height: `${(d.val / max) * 100}px` }} title={d.val}></div>
            <span className="bar-label">{d.label} ({d.val})</span>
          </div>
        ))}
      </div>
      <div className="bar-legend">
        <div className="bar-legend-dot"></div>
        <span>Complaints &amp; Issues</span>
      </div>
    </div>
  );
}

function RoomStatusChart({ rooms }) {
  const total = rooms.length || 1;
  const occupied = rooms.filter(r => r.occupancy && r.occupancy.includes('Occupied')).length;
  const vacant = rooms.filter(r => r.occupancy === 'Vacant').length;
  const maintenance = rooms.filter(r => (r.maintenanceStatus || r.maintenance) === 'Under Maintenance').length;

  const occPct = Math.round((occupied / total) * 100) || 0;
  const vacPct = Math.round((vacant / total) * 100) || 0;
  let mainPct = 100 - occPct - vacPct;
  if (mainPct < 0) mainPct = 0;

  const data = [
    { label: `Occupied ${occPct}%`, value: occPct, color: '#2563eb' },
    { label: `Vacant ${vacPct}%`, value: vacPct, color: '#16a34a' },
    { label: `Maintenance ${mainPct}%`, value: mainPct, color: '#f5a623' }
  ];

  let startAngle = 0;
  const cx = 70, cy = 70, r = 60;

  return (
    <div className="chart-card">
      <h3>Room Status Distribution</h3>
      <div className="pie-wrapper">
        <svg className="pie-chart-svg" width="140" height="140" viewBox="0 0 140 140">
          {total > 1 || rooms.length > 0 ? data.map((d, i) => {
            const angle = (d.value / 100) * 2 * Math.PI;
            if (angle === 0) return null;
            
            if (angle >= 2 * Math.PI - 0.001) {
              return <circle key={i} cx={cx} cy={cy} r={r} fill={d.color} stroke="white" strokeWidth="2" />;
            }

            const endAngle = startAngle + angle;
            const x1 = cx + r * Math.sin(startAngle);
            const y1 = cy - r * Math.cos(startAngle);
            const x2 = cx + r * Math.sin(endAngle);
            const y2 = cy - r * Math.cos(endAngle);
            const large = angle > Math.PI ? 1 : 0;
            const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
            startAngle = endAngle;
            return <path key={i} d={path} fill={d.color} stroke="white" strokeWidth="2" />;
          }) : <circle cx={cx} cy={cy} r={r} fill="#e5e7eb" stroke="white" strokeWidth="2" />}
        </svg>
        <div className="pie-legend" id="pie-legend">
          {data.map((d, i) => (
            <div key={i} className="pie-legend-item">
              <div className="pie-dot" style={{ background: d.color }}></div>
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentComplaints({ complaints }) {
  if (complaints.length === 0) {
    return (
      <div id="recent-complaints">
        <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No recent complaints</p>
      </div>
    );
  }

  const recent = complaints.slice(0, 3);
  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

  return (
    <div id="recent-complaints">
      {recent.map((c, i) => {
        const tenantDisplayName = typeof c.tenant === 'object' && c.tenant !== null 
          ? (c.tenant.name || 'Tenant') 
          : (c.tenant || 'Tenant');
        const roomDisplay = typeof c.room === 'object' && c.room !== null
          ? (c.room.roomNumber || '101')
          : (c.room || '101');
        const compType = c.type || c.title || 'General';

        return (
          <div key={c.id || i} className="complaint-item">
            <div className="complaint-info">
              <strong>{compType} issue</strong>
              <span>{tenantDisplayName} - Room {roomDisplay}</span>
            </div>
            <div className="complaint-meta">
              <span className={`badge badge-${c.priority || 'medium'}`}>{capitalize(c.priority || 'medium')}</span>
              <div className="complaint-time">{c.date || 'Recently'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentActivity() {
  const items = [
    { id: 1, text: 'New tenant check-in', sub: 'Sneha Patil - Room 208', time: '1 day ago' },
    { id: 2, text: 'Room change request', sub: 'Anita Desai - Room 305', time: '3 days ago' }
  ];

  return (
    <div id="recent-activity">
      {items.map(item => (
        <div key={item.id} className="activity-item">
          <div className="activity-dot"></div>
          <div className="activity-info">
            <strong>{item.text}</strong>
            <span>{item.sub}</span>
          </div>
          <div className="activity-time">{item.time}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data } = useWardenData();
  const navigate = useNavigate();
  const { tenants, rooms, complaints, violations } = data;

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.occupancy && r.occupancy.includes('Occupied')).length;
  const vacantRooms = rooms.filter(r => r.occupancy === 'Vacant').length;
  const activeComplaints = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const ruleViolations = violations.length;

  return (
    <section id="dashboard-section" className="section active">
      <div className="section-header">
        <h2>Warden Dashboard</h2>
        <p>Overview of PG operations and tenant management</p>
      </div>

      <div className="stats-grid">
        <StatCard icon="blue" color="blue" materialIcon="group" label="Total Tenants" value={tenants.length} sub="+0 this month" />
        <StatCard icon="green" color="green" materialIcon="home" label="Occupied Rooms" value={occupiedRooms} sub="of total rooms" />
        <StatCard icon="yellow" color="yellow" materialIcon="home" label="Vacant Rooms" value={vacantRooms} sub="Available" />
        <StatCard icon="red" color="red" materialIcon="schedule" label="Active Complaints" value={activeComplaints} sub="2 urgent" />
        <StatCard icon="orange" color="orange" materialIcon="warning" label="Rule Violations" value={ruleViolations} sub="2 this week" />
      </div>

      <div className="charts-row">
        <ComplaintsChart complaints={complaints} />
        <RoomStatusChart rooms={rooms} />
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => navigate('/tenants')}>
            <span className="action-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>group</span></span>
            <div className="action-text">
              <strong>View Tenants</strong>
              <span>Manage tenant records</span>
            </div>
          </button>
          <button className="action-btn" onClick={() => navigate('/violations')}>
            <span className="action-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>warning</span></span>
            <div className="action-text">
              <strong>Report Violation</strong>
              <span>Log rule violations</span>
            </div>
          </button>
          <button className="action-btn" onClick={() => navigate('/rooms')}>
            <span className="action-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>check_circle</span></span>
            <div className="action-text">
              <strong>Update Room Status</strong>
              <span>Manage room services</span>
            </div>
          </button>
        </div>
      </div>

      <div className="bottom-row">
        <div className="bottom-card">
          <h3>Recent Complaints</h3>
          <RecentComplaints complaints={complaints} />
        </div>
        <div className="bottom-card">
          <h3>Recent Tenant Activity</h3>
          <RecentActivity />
        </div>
      </div>
    </section>
  );
}
