import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWardenData } from '../utils/dataStore';
import { useSelector } from 'react-redux';
import { selectOccupancyReport } from '../../../features/warden/wardenSlices';
import BedSyncPanel from '../components/BedSyncPanel';

function StatCard({ color, label, value, sub, materialIcon }) {
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
          ? (c.room.roomNumber || '—')
          : (c.room || '—');
        const compType = c.type || c.title || 'General';

        return (
          <div key={`${c.entityType}-${c.id}`} className="complaint-item">
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

function RecentActivity({ notifications }) {
  const items = notifications.slice(0, 3).map(n => ({
    id: n.id,
    text: n.title,
    sub: [n.senderName, n.roomNumber && `Room ${n.roomNumber}`].filter(Boolean).join(' - '),
    time: n.time,
  }));
  if (items.length === 0) {
    return <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center', padding: '16px' }}>No recent activity</p>;
  }

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

  // Counts come from active stays (who is actually living here), not the stored room counters.
  const report = useSelector(selectOccupancyReport);
  const totalRooms = rooms.length;
  const occupiedRooms = report.staysLoaded ? report.fullRooms : rooms.filter(r => r.occupancy && r.occupancy.includes('Occupied')).length;
  const activeComplaints = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const ruleViolations = violations.length;

  return (
    <section id="dashboard-section" className="section active">
      <div className="section-header">
        <h2>Warden Dashboard</h2>
        <p>Overview of PG operations and tenant management</p>
      </div>

      <div className="stats-grid">
        <StatCard
          color="blue"
          materialIcon="group"
          label="Residents"
          value={report.staysLoaded ? report.residents : tenants.length}
          sub={report.staysLoaded ? `${report.tenantsWithBed} tenant accounts · ${report.properties.length} PGs` : 'Tenant accounts'}
        />
        <StatCard color="green" materialIcon="home" label="Full Rooms" value={occupiedRooms} sub={`of ${totalRooms} rooms`} />
        <StatCard color="yellow" materialIcon="bed" label="Free Beds" value={report.staysLoaded ? report.freeBeds : '—'} sub={report.staysLoaded ? `of ${report.totalBeds} beds` : ''} />
        <StatCard color="red" materialIcon="schedule" label="Active Complaints" value={activeComplaints} sub={`${complaints.filter(c => c.priority === 'high' && c.status !== 'resolved').length} urgent`} />
        <StatCard color="orange" materialIcon="warning" label="Rule Violations" value={ruleViolations} sub={`${violations.filter(v => v.severity === 'high').length} high severity`} />
      </div>

      <BedSyncPanel />

      <div className="charts-row">
        <ComplaintsChart complaints={complaints} />
        <RoomStatusChart rooms={rooms} />
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => navigate('/dashboard/warden/tenants')}>
            <span className="action-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>group</span></span>
            <div className="action-text">
              <strong>View Tenants</strong>
              <span>Manage tenant records</span>
            </div>
          </button>
          <button className="action-btn" onClick={() => navigate('/dashboard/warden/violations')}>
            <span className="action-icon"><span className="material-icons-outlined" style={{ fontSize: '24px' }}>warning</span></span>
            <div className="action-text">
              <strong>Report Violation</strong>
              <span>Log rule violations</span>
            </div>
          </button>
          <button className="action-btn" onClick={() => navigate('/dashboard/warden/rooms')}>
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
          <RecentActivity notifications={data.notifications} />
        </div>
      </div>
    </section>
  );
}
