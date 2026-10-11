import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

const Notifications = () => {
  const { tenant } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!tenant) return;
    try {
      setLoading(true);
      const data = await apiFetch('/notifications');
      // The backend mock data does not contain userId or targetRole.
      // In a real app we'd filter by recipient list. For now, show all.
      const userNotifs = data;
      setNotifications(userNotifs);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [tenant]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const total = notifications.length;

  const markAllRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      for (let n of unreadNotifs) {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PUT' }).catch(() => {});
      }
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with all your activities</p>
        </div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          {unreadCount > 0 && <span className="badge badge-info">{unreadCount} Unread</span>}
          <button className="btn btn-outline btn-sm" onClick={markAllRead} disabled={unreadCount === 0}>Mark All as Read</button>
        </div>
      </div>
      
      <div className="stats-grid mb-20" style={{marginBottom: '20px'}}>
        <div className="stat-card">
          <div className="stat-label">Total <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>notifications</span></span></div>
          <div className="stat-value">{total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Unread <span className="stat-icon"><span className="material-icons-outlined" style={{fontSize: '32px'}}>notifications</span></span></div>
          <div className="stat-value" style={{color: 'var(--primary)'}}>{unreadCount}</div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body">
          <div className="card-title">All Notifications</div>
          <div className="mt-14" style={{marginTop: '14px', color: 'var(--text-muted)'}}>
            {loading ? (
              <p>Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p>No new notifications.</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {notifications.map(n => (
                  <div key={n.id} style={{padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: n.read ? 'transparent' : 'var(--bg-main)'}}>
                    <div style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{n.title}</div>
                    <div style={{fontSize: '14px', marginTop: '4px'}}>{n.message}</div>
                    <div style={{fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)'}}>{new Date(n.createdAt || Date.now()).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
