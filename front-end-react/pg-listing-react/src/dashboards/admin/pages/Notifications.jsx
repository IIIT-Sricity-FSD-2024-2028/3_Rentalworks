import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

export default function Notifications() {
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [notifHistory, setNotifHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [notifType, setNotifType] = useState('announcement');
  const [priority, setPriority] = useState('routine');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [targetPG, setTargetPG] = useState('all');
  const [targetUser, setTargetUser] = useState('all');
  const [showPG, setShowPG] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [scheduleDt, setScheduleDt] = useState('');

  const load = useCallback(async () => {
    try {
      const [uList, pList, nList] = await Promise.all([
        api.getUsers(),
        api.getProperties(),
        api.getNotifications()
      ]);
      setUsers(Array.isArray(uList) ? uList : []);
      setProperties(Array.isArray(pList) ? pList : []);
      setNotifHistory(Array.isArray(nList) ? nList : []);
    } catch {
      toast('error', 'Error', 'Failed to load announcements data');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = {
    all: users.length,
    tenants: users.filter(u => u.role === 'tenant').length,
    owners: users.filter(u => u.role === 'owner').length,
    wardens: users.filter(u => u.role === 'warden').length
  };

  const getFilteredRecipients = () => {
    let filtered = users;
    if (targetRole !== 'all') filtered = filtered.filter(u => u.role === targetRole);
    if (targetRole !== 'all' && targetPG !== 'all') {
      filtered = filtered.filter(u => u.property === targetPG || String(u.propertyId) === String(targetPG));
    }
    if (targetPG !== 'all' && targetUser !== 'all') {
      filtered = filtered.filter(u => String(u.id) === String(targetUser));
    }
    return filtered.length;
  };

  const recipientCount = getFilteredRecipients();

  const handleRoleChange = (val) => {
    setTargetRole(val);
    setTargetPG('all');
    setTargetUser('all');
    setShowPG(val === 'tenant' || val === 'warden');
    setShowUser(false);
  };

  const handlePGChange = (val) => {
    setTargetPG(val);
    setTargetUser('all');
    setShowUser(val !== 'all');
  };

  const handleSend = async () => {
    if (!title.trim()) { toast('error', 'Missing Title', 'Enter an announcement title'); return; }
    if (!message.trim()) { toast('error', 'Missing Message', 'Enter an announcement message'); return; }
    if (recipientCount === 0) { toast('error', 'No Recipients', 'Select valid recipients'); return; }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      type: notifType,
      priority,
      recipients: recipientCount,
      targetRole,
      targetPG,
      targetUser
    };

    try {
      const created = await api.createNotification(payload);
      setNotifHistory(prev => [created, ...prev]);
      setTitle('');
      setMessage('');
      toast('success', 'Announcement Sent', `Broadcast sent to ${recipientCount} users`);
    } catch {
      toast('error', 'Error', 'Failed to send announcement');
    }
  };

  const handleSchedule = async () => {
    if (!title.trim()) { toast('error', 'Missing Title', 'Enter an announcement title'); return; }
    if (!message.trim()) { toast('error', 'Missing Message', 'Enter an announcement message'); return; }
    if (!scheduleDt) { toast('error', 'No Schedule Time', 'Pick a date and time'); return; }
    if (recipientCount === 0) { toast('error', 'No Recipients', 'Select valid recipients'); return; }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      type: notifType,
      priority,
      recipients: recipientCount,
      sentAt: new Date(scheduleDt).toISOString(),
      targetRole
    };

    try {
      const created = await api.createNotification(payload);
      setNotifHistory(prev => [created, ...prev]);
      setTitle('');
      setMessage('');
      setScheduleDt('');
      toast('info', 'Announcement Scheduled', `Scheduled for ${new Date(scheduleDt).toLocaleString()}`);
    } catch {
      toast('error', 'Error', 'Failed to schedule announcement');
    }
  };

  const handleDeleteNotif = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifHistory(prev => prev.filter(x => String(x.id) !== String(id)));
      toast('success', 'Deleted', 'Announcement removed from history');
    } catch {
      toast('error', 'Error', 'Failed to remove announcement');
    }
  };

  const totalSent = notifHistory.length;
  const totalReach = notifHistory.reduce((s, n) => s + (Number(n.recipients) || 0), 0);

  return (
    <>
      <div className="sec-hdr">
        <h2>Platform Announcements</h2>
        <p>Broadcast system-wide updates to all users</p>
      </div>

      <div className="notif-layout">
        {/* Compose Panel */}
        <div className="notif-compose">
          <h3>
            <span className="material-icons-outlined" style={{ fontSize: 24, verticalAlign: 'middle', marginRight: 6 }}>outbox</span>
            Create Announcement
          </h3>
          <p>Compose and broadcast platform-level announcements</p>

          {/* Type buttons */}
          <div className="notif-type-btns">
            <button
              className={`type-btn ${notifType === 'announcement' ? 'active' : ''}`}
              onClick={() => setNotifType('announcement')}
            >
              <span className="material-icons-outlined" style={{ fontSize: 18 }}>notifications</span> Announcement
            </button>
            <button
              className={`type-btn ${notifType === 'alert' ? 'active' : ''}`}
              onClick={() => setNotifType('alert')}
            >
              ✉️ Alert
            </button>
            <button
              className={`type-btn ${notifType === 'update' ? 'active' : ''}`}
              onClick={() => setNotifType('update')}
            >
              <span className="material-icons-outlined" style={{ fontSize: 18 }}>outbox</span> Update
            </button>
          </div>

          {/* Priority Level */}
          <div className="notif-field">
            <label>Priority Level</label>
            <div className="priority-btns">
              <button
                className={`priority-btn ${priority === 'routine' ? 'active' : ''}`}
                data-priority="routine"
                onClick={() => setPriority('routine')}
              >
                🟢 Routine
              </button>
              <button
                className={`priority-btn ${priority === 'important' ? 'active' : ''}`}
                data-priority="important"
                onClick={() => setPriority('important')}
              >
                🟡 Important
              </button>
              <button
                className={`priority-btn ${priority === 'urgent' ? 'active' : ''}`}
                data-priority="urgent"
                onClick={() => setPriority('urgent')}
              >
                <span className="material-icons-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>error</span> Urgent
              </button>
            </div>
          </div>

          {/* Target Audience */}
          <div className="notif-field">
            <label>Target Audience *</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select
                style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, background: 'white', color: '#1e293b' }}
                value={targetRole}
                onChange={e => handleRoleChange(e.target.value)}
              >
                <option value="all">Broadcast to All Users</option>
                <option value="tenant">Tenants Only</option>
                <option value="warden">Wardens Only</option>
                <option value="owner">Owners Only</option>
              </select>

              {showPG && (
                <select
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, background: 'white', color: '#1e293b' }}
                  value={targetPG}
                  onChange={e => handlePGChange(e.target.value)}
                >
                  <option value="all">All Properties</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              )}

              {showUser && (
                <select
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, background: 'white', color: '#1e293b' }}
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                >
                  <option value="all">All Members in this PG</option>
                  {users.filter(u => u.property === targetPG).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="notif-field">
            <label>Title *</label>
            <input
              type="text"
              placeholder="Enter announcement title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="notif-field">
            <label>Message *</label>
            <textarea
              placeholder="Enter announcement message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {/* Send + Schedule */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button className="btn-send" style={{ flex: 1 }} onClick={handleSend}>
              <span className="material-icons-outlined" style={{ fontSize: 20 }}>outbox</span> Send Now
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <input
                type="datetime-local"
                style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: 12 }}
                value={scheduleDt}
                onChange={e => setScheduleDt(e.target.value)}
              />
              <button className="btn-schedule" onClick={handleSchedule}>
                <span className="material-icons-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>calendar_today</span>
                Schedule Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Recipients + Stats */}
        <div>
          <div className="recipients-card">
            <h4>Recipient Counts</h4>
            <div className={`recipient-item ${targetRole === 'all' ? 'selected' : ''}`} onClick={() => handleRoleChange('all')}>
              <div className="rec-left">
                <span className="material-icons-outlined" style={{ fontSize: 22 }}>group</span> All Users
              </div>
              <span className="rec-count">{counts.all}</span>
            </div>
            <div className={`recipient-item ${targetRole === 'tenant' ? 'selected' : ''}`} onClick={() => handleRoleChange('tenant')}>
              <div className="rec-left">
                <span className="material-icons-outlined" style={{ fontSize: 22 }}>person</span> All Tenants
              </div>
              <span className="rec-count" style={{ color: '#16a34a' }}>{counts.tenants}</span>
            </div>
            <div className={`recipient-item ${targetRole === 'owner' ? 'selected' : ''}`} onClick={() => handleRoleChange('owner')}>
              <div className="rec-left">
                <span className="material-icons-outlined" style={{ fontSize: 22 }}>apartment</span> Property Owners
              </div>
              <span className="rec-count" style={{ color: '#7c3aed' }}>{counts.owners}</span>
            </div>
            <div className={`recipient-item ${targetRole === 'warden' ? 'selected' : ''}`} onClick={() => handleRoleChange('warden')}>
              <div className="rec-left">👮 Wardens</div>
              <span className="rec-count" style={{ color: '#16a34a' }}>{counts.wardens}</span>
            </div>
          </div>

          <div className="notif-stats-card">
            <h4>Announcement Stats</h4>
            <div className="ns-row">
              <span>Total Sent</span>
              <strong>{totalSent}</strong>
            </div>
            <div className="ns-row">
              <span>Total Reach</span>
              <strong>{totalReach}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="notif-history">
        <h3>Announcement History</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Loading history...</div>
        ) : notifHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>No announcements sent yet</div>
        ) : (
          notifHistory.map((n, idx) => (
            <div key={n.id || idx} className="nh-item">
              <div className={`nh-icon ${n.type || 'announcement'}`}>
                {n.type === 'alert' ? '✉️' : n.type === 'update' ? '🚀' : '📢'}
              </div>
              <div className="nh-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong>{n.title}</strong>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`nh-type-badge ${n.type || 'announcement'}`}>{n.type || 'announcement'}</span>
                    <button
                      className="ico-btn danger"
                      onClick={() => handleDeleteNotif(n.id)}
                      title="Delete"
                      style={{ width: 22, height: 22 }}
                    >
                      <span className="material-icons-outlined" style={{ fontSize: 13 }}>close</span>
                    </button>
                  </div>
                </div>
                <p>{n.message}</p>
                <div className="nh-meta">
                  <span>📅 {n.sentAt ? new Date(n.sentAt).toLocaleDateString('en-IN') : 'Recent'}</span>
                  <span>👥 Reach: {n.recipients || 1} users</span>
                  {n.priority && <span>⚡ {n.priority}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
