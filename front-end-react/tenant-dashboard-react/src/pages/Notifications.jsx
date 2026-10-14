import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Notifications = () => {
  const { tenant } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [tenant]);

  const isItemRead = (n) => Boolean(n.isRead ?? n.read);

  const unreadCount = notifications.filter((n) => !isItemRead(n)).length;
  const total = notifications.length;

  const markAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Fallback to item-by-item patch
      try {
        const unreadItems = notifications.filter((n) => !isItemRead(n));
        for (const item of unreadItems) {
          await apiFetch(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => {});
        }
        await fetchNotifications();
      } catch (inner) {
        console.error(inner);
      }
    }
  };

  const markSingleRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      await fetchNotifications();
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  };

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with all your stay, issues, and service activities</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {unreadCount > 0 && <span className="badge badge-info">{unreadCount} Unread</span>}
          <button
            className="btn btn-outline btn-sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark All as Read
          </button>
        </div>
      </div>

      <div className="stats-grid mb-20" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">
            Total Notifications{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
                notifications
              </span>
            </span>
          </div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">
            Unread{' '}
            <span className="stat-icon">
              <span className="material-icons-outlined" style={{ fontSize: '32px' }}>
                mark_email_unread
              </span>
            </span>
          </div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {unreadCount}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="card-title">Recent Activity & Notifications</div>
          <div className="mt-14" style={{ marginTop: '14px' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading notifications...</p>
            ) : error ? (
              <p style={{ color: 'var(--danger)' }}>{error}</p>
            ) : notifications.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No notifications yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {notifications.map((n) => {
                  const read = isItemRead(n);
                  return (
                    <div
                      key={n.id}
                      style={{
                        padding: '14px 16px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: read ? 'transparent' : 'var(--bg-main)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: read ? '500' : '700',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {!read && (
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                display: 'inline-block',
                              }}
                            ></span>
                          )}
                          {n.title}
                        </div>
                        <div style={{ fontSize: '14px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '6px', color: 'var(--text-muted)' }}>
                          {n.createdAt
                            ? new Date(n.createdAt).toLocaleString()
                            : n.sentAt || 'Just now'}
                        </div>
                      </div>

                      {!read && (
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '12px' }}
                          onClick={() => markSingleRead(n.id)}
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
