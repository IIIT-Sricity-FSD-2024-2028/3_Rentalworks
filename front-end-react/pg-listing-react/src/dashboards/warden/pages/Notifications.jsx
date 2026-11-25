import React from 'react';
import { useWardenData, useWardenRun, useWardenToast } from '../utils/dataStore';
import {
  deleteWardenNotification,
  markAllWardenNotificationsRead,
  markWardenNotificationRead,
} from '../../../features/warden/wardenSlices';

export default function Notifications() {
  const { data } = useWardenData();
  const run = useWardenRun();

  const notifications = data.notifications || [];

  const showToast = useWardenToast();

  const total = notifications.length;
  const unread = notifications.filter(n => !n.read).length;
  const read = notifications.filter(n => n.read).length;

  const handleMarkAllAsRead = async () => {
    try {
      await run(markAllWardenNotificationsRead());
      showToast('success', 'Done', 'All notifications marked as read');
    } catch {
      showToast('error', 'Error', 'Could not mark notifications as read');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await run(markWardenNotificationRead(id));
    } catch {
      showToast('error', 'Error', 'Could not mark notification as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await run(deleteWardenNotification(id));
      showToast('success', 'Done', 'Notification deleted');
    } catch {
      showToast('error', 'Error', 'Could not delete notification');
    }
  };

  return (
    <section id="notifications-section" className="section active">
      <div className="section-header">
        <h2>Warden Notifications</h2>
        <p>You have <span>{unread}</span> unread notifications from tenants and owners</p>
      </div>

      <div className="notif-summary">
        <div className="summary-card">
          <div className="s-label">Total</div>
          <div className="s-value">{total}</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Unread</div>
          <div className="s-value" style={{ color: '#f5a623' }}>{unread}</div>
        </div>
        <div className="summary-card">
          <div className="s-label">Read</div>
          <div className="s-value green">{read}</div>
        </div>
      </div>

      <div className="notif-list">
        <div className="notif-list-header">
          <h3>All Warden Notifications</h3>
          {unread > 0 && (
            <button className="btn-mark-all" onClick={handleMarkAllAsRead}>
              <span className="material-icons-outlined" style={{ fontSize: '24px' }}>check_circle</span> 
              Mark all as read
            </button>
          )}
        </div>
        <div id="notifications-list">
          {notifications.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px', fontSize: '13px' }}>
              No notifications yet
            </p>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                <div className={`notif-icon-wrap ${n.icon}`}>
                  {n.icon === 'owner' ? '👑' : n.icon === 'warning' ? '⚠️' : n.icon === 'check' ? '✅' : 'ℹ️'}
                </div>
                <div className="notif-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong>{n.title}</strong>
                    {n.senderRole === 'owner' && (
                      <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        From Owner: {n.senderName}
                      </span>
                    )}
                    {n.senderRole === 'tenant' && (
                      <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        Tenant: {n.senderName} {n.roomNumber ? `(Room ${n.roomNumber})` : ''}
                      </span>
                    )}
                    {n.propertyName && (
                      <span style={{ background: '#f3f4f6', color: '#4b5563', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>
                        🏢 {n.propertyName}
                      </span>
                    )}
                  </div>
                  <p style={{ marginTop: '4px' }}>{n.message}</p>
                  <time>{n.time}</time>
                </div>
                <div className="notif-actions">
                  {!n.read && (
                    <>
                      <div className="unread-dot" title="Unread"></div>
                      <span 
                        className="mark-read-notif" 
                        onClick={() => handleMarkAsRead(n.id)} 
                        title="Mark as Read"
                        style={{ cursor: 'pointer', fontSize: '12px', color: '#4f46e5', marginRight: '10px', textDecoration: 'underline' }}
                      >
                        Mark Read
                      </span>
                    </>
                  )}
                  <span 
                    className="delete-notif" 
                    onClick={() => handleDelete(n.id)} 
                    title="Delete"
                    style={{ cursor: 'pointer' }}
                  >
                    🗑️
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </section>
  );
}
