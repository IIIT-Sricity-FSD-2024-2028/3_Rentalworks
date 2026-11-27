import { useEffect } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { adminNotifications, adminUsers } from '../../../features/admin/adminSlices';
import { useToast } from '../components/useToast';
import { selectCurrentUser } from '../../../features/auth/authSlice';

export default function Notifications() {
  const dispatch = useDispatch();
  const toast = useToast();
  const me = useSelector(selectCurrentUser);
  const users = useSelector(adminUsers.selectors.selectItems);
  const notifHistory = useSelector(adminNotifications.selectors.selectItems);
  const loading = useSelector(adminNotifications.selectors.selectIsLoading) && notifHistory.length === 0;
  const sending = useSelector(adminNotifications.selectors.selectMutating);

  const [notifType, setNotifType] = useScreenState('announcement');
  const [priority, setPriority] = useScreenState('routine');
  const [title, setTitle] = useScreenState('');
  const [message, setMessage] = useScreenState('');
  const [targetRole, setTargetRole] = useScreenState('all');
  const [targetUser, setTargetUser] = useScreenState('all');

  useEffect(() => {
    dispatch(adminUsers.thunks.fetchAll());
    dispatch(adminNotifications.thunks.fetchAll());
  }, [dispatch]);

  const counts = {
    all: users.length,
    tenants: users.filter(u => u.role === 'tenant').length,
    owners: users.filter(u => u.role === 'owner').length,
    wardens: users.filter(u => u.role === 'warden').length
  };

  const roleUsers = targetRole === 'all' ? [] : users.filter(u => u.role === targetRole);
  const recipientCount = targetRole === 'all' ? users.length : targetUser === 'all' ? roleUsers.length : 1;

  const handleRoleChange = (val) => {
    setTargetRole(val);
    setTargetUser('all');
  };

  const handleSend = async () => {
    if (!title.trim()) { toast('error', 'Missing Title', 'Enter an announcement title'); return; }
    if (!message.trim()) { toast('error', 'Missing Message', 'Enter an announcement message'); return; }
    if (recipientCount === 0) { toast('error', 'No Recipients', 'Select valid recipients'); return; }

    const data = { title: title.trim(), message: message.trim(), type: notifType, priority, recipients: recipientCount, targetRole };
    if (targetUser !== 'all') data.userId = Number(targetUser);
    const { ok } = await runThunk(dispatch, adminNotifications.thunks.createItem({ data, byUserId: me?.id }), {
      success: `Announcement sent to ${recipientCount} user${recipientCount === 1 ? '' : 's'}`,
    });
    if (!ok) return;
    setTitle('');
    setMessage('');
  };

  const handleDeleteNotif = (id) =>
    runThunk(dispatch, adminNotifications.thunks.removeItem(id), { success: 'Announcement removed from history' });

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

              {targetRole !== 'all' && (
                <select
                  style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1', flex: 1, background: 'white', color: '#1e293b' }}
                  value={targetUser}
                  onChange={e => setTargetUser(e.target.value)}
                >
                  <option value="all">Everyone in this role ({roleUsers.length})</option>
                  {roleUsers.map(u => (
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

          <button className="btn-send" style={{ width: '100%' }} onClick={handleSend} disabled={sending}>
            <span className="material-icons-outlined" style={{ fontSize: 20 }}>outbox</span> {sending ? 'Sending…' : 'Send Now'}
          </button>
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
