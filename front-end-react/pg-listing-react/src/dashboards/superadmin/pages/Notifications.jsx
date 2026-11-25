import { useState } from 'react';
import { api } from '../services/api';

const priorityColors = {
  routine: { background: '#f1f5f9', color: '#64748b' },
  normal: { background: '#f1f5f9', color: '#64748b' },
  important: { background: '#fef9c3', color: '#b45309' },
  medium: { background: '#fef9c3', color: '#b45309' },
  urgent: { background: '#fee2e2', color: '#dc2626' },
  high: { background: '#fee2e2', color: '#dc2626' },
};

function getActorInfo(item) {
  const role = item.byUser?.role;
  const name = item.byUser?.name;
  if (role === 'owner') return { role: 'Owner', name: name || 'Property Owner', badgeBg: '#f3e8ff', badgeColor: '#7e22ce', icon: 'apartment' };
  if (role === 'warden') return { role: 'Warden', name: name || 'Warden Officer', badgeBg: '#e0f2fe', badgeColor: '#0369a1', icon: 'security' };
  if (role === 'tenant') return { role: 'Tenant', name: name || 'Resident', badgeBg: '#dcfce7', badgeColor: '#15803d', icon: 'person' };
  if (role === 'super_admin' || role === 'admin') return { role: 'Admin', name: name || 'Super Admin', badgeBg: '#fee2e2', badgeColor: '#b91c1c', icon: 'admin_panel_settings' };

  const title = (item.title || '').toLowerCase();
  const desc = (item.message || '').toLowerCase();
  if (title.includes('owner') || desc.includes('owner')) return { role: 'Owner', name: 'Property Owner', badgeBg: '#f3e8ff', badgeColor: '#7e22ce', icon: 'apartment' };
  if (title.includes('warden') || desc.includes('warden')) return { role: 'Warden', name: 'Warden', badgeBg: '#e0f2fe', badgeColor: '#0369a1', icon: 'security' };
  if (title.includes('tenant') || title.includes('issue') || desc.includes('room')) return { role: 'Tenant', name: 'Tenant', badgeBg: '#dcfce7', badgeColor: '#15803d', icon: 'person' };

  return { role: 'System', name: 'System', badgeBg: '#f1f5f9', badgeColor: '#475569', icon: 'dns' };
}

export default function Notifications({ data, refresh, showToast }) {
  const { users, properties, notifications } = data;
  const [activeTab, setActiveTab] = useState('inbox');
  const [actorFilter, setActorFilter] = useState('all');

  // Compose State
  const [type, setType] = useState('announcement');
  const [priority, setPriority] = useState('routine');
  const [role, setRole] = useState('all');
  const [property, setProperty] = useState('all');
  const [targetUser, setTargetUser] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [sending, setSending] = useState(false);

  const activeUsers = users.filter(user => user.status === 'active');
  const recipients = activeUsers.filter(user =>
    (role === 'all' || user.role === role) &&
    (property === 'all' || (user.propertyIds || []).includes(Number(property))) &&
    (targetUser === 'all' || String(user.id) === targetUser)
  );
  const canSelectProperty = role === 'tenant' || role === 'warden';
  const matchingUsers = activeUsers.filter(user => user.role === role && (user.propertyIds || []).includes(Number(property)));

  const actorStats = {
    all: (notifications || []).length,
    Owner: (notifications || []).filter(item => getActorInfo(item).role === 'Owner').length,
    Warden: (notifications || []).filter(item => getActorInfo(item).role === 'Warden').length,
    Tenant: (notifications || []).filter(item => getActorInfo(item).role === 'Tenant').length,
    System: (notifications || []).filter(item => getActorInfo(item).role === 'System').length,
  };

  const filteredNotifications = (notifications || []).filter(item => {
    if (actorFilter === 'all') return true;
    return getActorInfo(item).role === actorFilter;
  });

  async function submit(isScheduled) {
    if (!title.trim() || !message.trim()) { showToast('error', 'Required', 'Enter a title and message.'); return; }
    if (!recipients.length) { showToast('error', 'No Recipients', 'Your current filters select 0 users.'); return; }
    if (isScheduled && (!scheduleAt || new Date(scheduleAt) <= new Date())) {
      showToast('error', 'No Schedule Time', 'Pick a future date and time.'); return;
    }
    const notification = { title: title.trim(), message: message.trim(), type, priority, targetRole: role };
    if (property !== 'all') notification.targetPropertyId = Number(property);
    if (targetUser !== 'all') notification.targetUserId = Number(targetUser);
    if (isScheduled) notification.scheduledFor = new Date(scheduleAt).toISOString();
    setSending(true);
    try {
      await api.sendNotification(notification);
      await refresh();
      showToast('success', isScheduled ? 'Announcement Scheduled' : 'Announcement Sent', `${recipients.length} recipients`);
      setTitle(''); setMessage(''); setScheduleAt('');
      setActiveTab('inbox');
    } catch (error) { showToast('error', 'Error', error.message); }
    finally { setSending(false); }
  }

  return (
    <section id="notifications-sec" className="section active">
      <div className="sec-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2>Notifications &amp; Announcements Center</h2>
          <p>View incoming alerts from Owners, Wardens, &amp; Tenants, and broadcast platform updates</p>
        </div>
        <div style={{ display: 'flex', gap: 8, background: '#e2e8f0', padding: 4, borderRadius: 8 }}>
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'inbox' ? '#fff' : 'transparent',
              color: activeTab === 'inbox' ? '#1e293b' : '#64748b',
              boxShadow: activeTab === 'inbox' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>inbox</span>
            Incoming Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('compose')}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: activeTab === 'compose' ? '#2563eb' : 'transparent',
              color: activeTab === 'compose' ? '#fff' : '#64748b',
              boxShadow: activeTab === 'compose' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: 18 }}>campaign</span>
            + Broadcast Announcement
          </button>
        </div>
      </div>

      {activeTab === 'inbox' && (
        <div>
          {/* Actor Quick Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { id: 'all', label: 'All Alerts', count: actorStats.all, icon: 'all_inclusive' },
              { id: 'Owner', label: 'From Owners', count: actorStats.Owner, icon: 'apartment', color: '#7e22ce' },
              { id: 'Warden', label: 'From Wardens', count: actorStats.Warden, icon: 'security', color: '#0369a1' },
              { id: 'Tenant', label: 'From Tenants', count: actorStats.Tenant, icon: 'person', color: '#15803d' },
              { id: 'System', label: 'System & Automated', count: actorStats.System, icon: 'dns', color: '#475569' },
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setActorFilter(pill.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  border: actorFilter === pill.id ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                  background: actorFilter === pill.id ? '#eff6ff' : '#ffffff',
                  color: actorFilter === pill.id ? '#1d4ed8' : '#475569',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 16 }}>{pill.icon}</span>
                {pill.label}
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  background: actorFilter === pill.id ? '#2563eb' : '#f1f5f9',
                  color: actorFilter === pill.id ? '#ffffff' : '#64748b',
                }}>
                  {pill.count}
                </span>
              </button>
            ))}
          </div>

          {/* Incoming Alerts List */}
          <div className="notif-history" style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, background: '#fff' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons-outlined" style={{ fontSize: 20, color: '#2563eb' }}>mark_email_unread</span>
              {actorFilter === 'all' ? 'All Alerts & Cross-Actor Notifications' : `Alerts ${actorFilter}`} ({filteredNotifications.length})
            </h3>

            {filteredNotifications.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredNotifications.map(item => {
                  const actor = getActorInfo(item);
                  return (
                    <div
                      key={item.id || `${item.title}-${item.sentAt}`}
                      style={{
                        display: 'flex',
                        gap: 16,
                        padding: 16,
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        alignItems: 'flex-start',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: actor.badgeBg,
                          color: actor.badgeColor,
                          flexShrink: 0,
                        }}
                      >
                        <span className="material-icons-outlined" style={{ fontSize: 22 }}>{actor.icon}</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: actor.badgeBg,
                              color: actor.badgeColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            FROM {actor.role}: {actor.name}
                          </span>

                          <strong style={{ fontSize: 14, color: '#0f172a' }}>{item.title}</strong>

                          <span
                            style={Object.assign(
                              { fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 },
                              priorityColors[item.priority?.toLowerCase() || 'routine'] || priorityColors.routine
                            )}
                          >
                            {(item.priority || 'NORMAL').toUpperCase()}
                          </span>
                        </div>

                        <p style={{ margin: '4px 0 8px', fontSize: 13, color: '#334155', lineHeight: 1.45 }}>
                          {item.message}
                        </p>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#64748b' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                            {item.sentAt ? new Date(item.sentAt).toLocaleString('en-IN') : 'Recent'}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 14 }}>send</span>
                            Target: <strong>{(item.targetRole || 'ALL').toUpperCase()}</strong>
                          </span>
                          {item.recipients > 1 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-icons-outlined" style={{ fontSize: 14 }}>group</span>
                              {item.recipients} recipients
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <span className="material-icons-outlined" style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8, display: 'block' }}>notifications_off</span>
                <p style={{ fontSize: 14, fontWeight: 500 }}>No notifications found for this category</p>
                <p style={{ fontSize: 12 }}>Notifications sent from Owners, Wardens, or Tenants will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="notif-layout">
          <div className="notif-compose">
            <h3><span className="material-icons-outlined" style={{ fontSize: 24 }}>outbox</span> Create Announcement</h3>
            <p>Compose and broadcast platform-level announcements</p>

            <div className="notif-type-btns">
              {[['announcement', 'notifications', 'Announcement'], ['alert', null, '✉️ Alert'], ['update', 'outbox', 'Update']].map(([value, icon, label]) => (
                <button key={value} className={`type-btn ${type === value ? 'active' : ''}`} onClick={() => setType(value)}>
                  {icon && <span className="material-icons-outlined" style={{ fontSize: 24 }}>{icon}</span>} {label}
                </button>
              ))}
            </div>

            <div className="notif-field">
              <label>Priority Level</label>
              <div className="priority-btns">
                {[['routine', '🟢 Routine'], ['important', '🟡 Important'], ['urgent', 'Urgent']].map(([value, label]) => (
                  <button key={value} className={`priority-btn ${priority === value ? 'active' : ''}`} onClick={() => setPriority(value)}>
                    {value === 'urgent' && <span className="material-icons-outlined" style={{ fontSize: 24 }}>error</span>} {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="notif-field">
              <label>Target Audience *</label>
              <div className="cascading-targeting" style={{ display: 'flex', gap: 10 }}>
                <select style={selectStyle} value={role} onChange={event => { setRole(event.target.value); setProperty('all'); setTargetUser('all'); }}>
                  <option value="all">Broadcast to All Users</option>
                  <option value="tenant">Tenants Only</option>
                  <option value="warden">Wardens Only</option>
                  <option value="owner">Owners Only</option>
                </select>
                {canSelectProperty && (
                  <select style={selectStyle} value={property} onChange={event => { setProperty(event.target.value); setTargetUser('all'); }}>
                    <option value="all">All Properties</option>
                    {properties.map(pg => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
                  </select>
                )}
                {canSelectProperty && property !== 'all' && (
                  <select style={selectStyle} value={targetUser} onChange={event => setTargetUser(event.target.value)}>
                    <option value="all">All Members in this PG</option>
                    {matchingUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div className="notif-field">
              <label>Title *</label>
              <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Enter announcement title..." />
            </div>

            <div className="notif-field">
              <label>Message *</label>
              <textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="Enter announcement message..." />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <button className="btn-send" style={{ flex: 1 }} disabled={sending} onClick={() => submit(false)}>
                <span className="material-icons-outlined" style={{ fontSize: 24 }}>outbox</span> Send Now
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <input
                  type="datetime-local"
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
                  value={scheduleAt}
                  onChange={event => setScheduleAt(event.target.value)}
                />
                <button className="btn-schedule" disabled={sending} onClick={() => submit(true)}>
                  <span className="material-icons-outlined" style={{ fontSize: 24 }}>calendar_today</span> Schedule Send
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="recipients-card">
              <h4>Recipient Counts</h4>
              {[
                ['all', 'group', 'All Users', activeUsers.length],
                ['tenants', 'person', 'All Tenants', activeUsers.filter(user => user.role === 'tenant').length],
                ['owners', 'apartment', 'Property Owners', activeUsers.filter(user => user.role === 'owner').length],
                ['wardens', null, 'Wardens', activeUsers.filter(user => user.role === 'warden').length],
              ].map(([key, icon, label, count]) => (
                <div key={key} className={`recipient-item ${role === key || (role === 'tenant' && key === 'tenants') || (role === 'owner' && key === 'owners') || (role === 'warden' && key === 'wardens') ? 'selected' : ''}`}>
                  <div className="rec-left">{icon ? <span className="material-icons-outlined" style={{ fontSize: 24 }}>{icon}</span> : '👮'} {label}</div>
                  <span className="rec-count" style={{ color: key === 'owners' ? '#7c3aed' : key === 'all' ? undefined : '#16a34a' }}>{count}</span>
                </div>
              ))}
            </div>

            <div className="notif-stats-card">
              <h4>Announcement Stats</h4>
              <div className="ns-row">
                <span>Total Sent</span>
                <strong>{notifications.filter(item => item.deliveryStatus !== 'scheduled').length}</strong>
              </div>
              <div className="ns-row">
                <span>Total Reach</span>
                <strong>{notifications.filter(item => item.deliveryStatus !== 'scheduled').reduce((sum, item) => sum + Number(item.recipients || 0), 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const selectStyle = { padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, background: 'white', color: '#1e293b' };

