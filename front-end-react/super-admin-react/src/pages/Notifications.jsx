import { useState } from 'react';
import { api } from '../services/api';

const priorityColors = {
  routine: { background: '#f1f5f9', color: '#64748b' },
  important: { background: '#fef9c3', color: '#b45309' },
  urgent: { background: '#fee2e2', color: '#dc2626' },
};

export default function Notifications({ data, refresh, showToast }) {
  const { users, properties, notifications } = data;
  const [type, setType] = useState('announcement');
  const [priority, setPriority] = useState('routine');
  const [role, setRole] = useState('all');
  const [property, setProperty] = useState('all');
  const [targetUser, setTargetUser] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduled, setScheduled] = useState(() => {
    try { return JSON.parse(localStorage.getItem('super_admin_scheduled') || '[]'); }
    catch { return []; }
  });
  const [sending, setSending] = useState(false);

  const recipients = users.filter(user =>
    (role === 'all' || user.role === role) &&
    (property === 'all' || user.property === property) &&
    (targetUser === 'all' || String(user.id) === targetUser)
  );
  const canSelectProperty = role === 'tenant' || role === 'warden';
  const matchingUsers = users.filter(user => user.role === role && user.property === property);
  const history = [...scheduled, ...notifications].sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));

  async function submit(isScheduled) {
    if (!title.trim() || !message.trim()) { showToast('error', 'Required', 'Enter a title and message.'); return; }
    if (!recipients.length) { showToast('error', 'No Recipients', 'Your current filters select 0 users.'); return; }
    if (isScheduled && (!scheduleAt || new Date(scheduleAt) <= new Date())) {
      showToast('error', 'No Schedule Time', 'Pick a future date and time.'); return;
    }
    const notification = {
      title: title.trim(), message: message.trim(), type, priority, recipients: recipients.length,
      targetRole: role, by: 'Super Admin',
      sentAt: isScheduled ? new Date(scheduleAt).toISOString() : new Date().toISOString(),
    };
    setSending(true);
    try {
      if (isScheduled) {
        // This preserves the old portal's local schedule list; the backend has no scheduled-send endpoint.
        const next = [{ ...notification, id: Date.now(), scheduled: true }, ...scheduled];
        localStorage.setItem('super_admin_scheduled', JSON.stringify(next));
        setScheduled(next);
        showToast('info', 'Announcement Saved', 'Saved to the schedule list. Sending requires a scheduler.');
      } else {
        const saved = await api.sendNotification(notification);
        const cross = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
        localStorage.setItem('cross_notifications', JSON.stringify([...cross, saved]));
        await refresh();
        showToast('success', 'Announcement Sent', `Broadcast to ${recipients.length} users`);
      }
      setTitle(''); setMessage(''); setScheduleAt('');
    } catch (error) { showToast('error', 'Error', error.message); }
    finally { setSending(false); }
  }

  return <section id="notifications-sec" className="section active">
    <div className="sec-hdr"><h2>Platform Announcements</h2><p>Broadcast system-wide updates to all users</p></div>
    <div className="notif-layout">
      <div className="notif-compose"><h3><span className="material-icons-outlined" style={{ fontSize: 24 }}>outbox</span> Create Announcement</h3><p>Compose and broadcast platform-level announcements</p>
        <div className="notif-type-btns">
          {[['announcement', 'notifications', 'Announcement'], ['alert', null, '✉️ Alert'], ['update', 'outbox', 'Update']].map(([value, icon, label]) =>
            <button key={value} className={`type-btn ${type === value ? 'active' : ''}`} onClick={() => setType(value)}>{icon && <span className="material-icons-outlined" style={{ fontSize: 24 }}>{icon}</span>} {label}</button>
          )}
        </div>
        <div className="notif-field"><label>Priority Level</label><div className="priority-btns">
          {[['routine', '🟢 Routine'], ['important', '🟡 Important'], ['urgent', 'Urgent']].map(([value, label]) =>
            <button key={value} className={`priority-btn ${priority === value ? 'active' : ''}`} onClick={() => setPriority(value)}>{value === 'urgent' && <span className="material-icons-outlined" style={{ fontSize: 24 }}>error</span>} {label}</button>
          )}
        </div></div>
        <div className="notif-field"><label>Target Audience *</label><div className="cascading-targeting" style={{ display: 'flex', gap: 10 }}>
          <select style={selectStyle} value={role} onChange={event => { setRole(event.target.value); setProperty('all'); setTargetUser('all'); }}>
            <option value="all">Broadcast to All Users</option><option value="tenant">Tenants Only</option><option value="warden">Wardens Only</option><option value="owner">Owners Only</option>
          </select>
          {canSelectProperty && <select style={selectStyle} value={property} onChange={event => { setProperty(event.target.value); setTargetUser('all'); }}>
            <option value="all">All Properties</option>{properties.map(pg => <option key={pg.id || pg.name} value={pg.name}>{pg.name}</option>)}
          </select>}
          {canSelectProperty && property !== 'all' && <select style={selectStyle} value={targetUser} onChange={event => setTargetUser(event.target.value)}>
            <option value="all">All Members in this PG</option>{matchingUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>}
        </div></div>
        <div className="notif-field"><label>Title *</label><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Enter announcement title..." /></div>
        <div className="notif-field"><label>Message *</label><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Enter announcement message..." /></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button className="btn-send" style={{ flex: 1 }} disabled={sending} onClick={() => submit(false)}><span className="material-icons-outlined" style={{ fontSize: 24 }}>outbox</span> Send Now</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}><input type="datetime-local" style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12 }} value={scheduleAt} onChange={event => setScheduleAt(event.target.value)} /><button className="btn-schedule" disabled={sending} onClick={() => submit(true)}><span className="material-icons-outlined" style={{ fontSize: 24 }}>calendar_today</span> Schedule Send</button></div>
        </div>
      </div>
      <div><div className="recipients-card"><h4>Recipient Counts</h4>
        {[['all', 'group', 'All Users', users.length], ['tenants', 'person', 'All Tenants', users.filter(user => user.role === 'tenant').length], ['owners', 'apartment', 'Property Owners', users.filter(user => user.role === 'owner').length], ['wardens', null, 'Wardens', users.filter(user => user.role === 'warden').length]].map(([key, icon, label, count]) =>
          <div key={key} className={`recipient-item ${role === key || (role === 'tenant' && key === 'tenants') || (role === 'owner' && key === 'owners') || (role === 'warden' && key === 'wardens') ? 'selected' : ''}`}>
            <div className="rec-left">{icon ? <span className="material-icons-outlined" style={{ fontSize: 24 }}>{icon}</span> : '👮'} {label}</div><span className="rec-count" style={{ color: key === 'owners' ? '#7c3aed' : key === 'all' ? undefined : '#16a34a' }}>{count}</span>
          </div>
        )}
      </div><div className="notif-stats-card"><h4>Announcement Stats</h4><div className="ns-row"><span>Total Sent</span><strong>{notifications.length}</strong></div><div className="ns-row"><span>Total Reach</span><strong>{notifications.reduce((sum, item) => sum + Number(item.recipients || 0), 0).toLocaleString()}</strong></div></div></div>
    </div>
    <div className="notif-history"><h3>Announcement History</h3>{history.length ? history.map(item => <div className="nh-item" key={item.id || `${item.title}-${item.sentAt}`}>
      <div className={`nh-icon ${item.type}`}>{item.type === 'announcement' ? '🔔' : item.type === 'update' ? '📤' : '✉️'}</div>
      <div className="nh-content"><strong>{item.title}</strong> <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600, marginLeft: 6, ...priorityColors[item.priority || 'routine'] }}>{item.priority || 'routine'}</span><p>{item.message}</p><div className="nh-meta"><span>👥 {Number(item.recipients || 0).toLocaleString()} recipients</span><span>Sent: {item.sentAt ? new Date(item.sentAt).toLocaleString('en-IN') : ''}</span><span>By: {item.by || 'Super Admin'}</span>{item.scheduled && <span style={{ color: '#7c3aed' }}>📅 Scheduled</span>}</div></div>
      <span className={`nh-type-badge ${item.type}`}>{item.type}</span>
    </div>) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: 24, fontSize: 13 }}>No announcements sent yet</p>}</div>
  </section>;
}

const selectStyle = { padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, background: 'white', color: '#1e293b' };
