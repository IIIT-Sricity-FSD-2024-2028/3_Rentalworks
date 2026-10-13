import React, { useState } from 'react';

// Notifications: View, filter, mark read, send messages, and clear alerts
export default function Notifications({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAllNotifications,
  onSendNotification,
}) {
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [deletingNotif, setDeletingNotif] = useState(null);

  const [sendForm, setSendForm] = useState({
    recipient: 'Warden',
    title: '',
    message: '',
  });
  const [sendError, setSendError] = useState('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (currentFilter === 'unread') return !n.read;
    if (currentFilter !== 'all') return n.type === currentFilter;
    return true;
  });

  const handleSendSubmit = (e) => {
    e.preventDefault();
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      setSendError('Please fill in both title and message.');
      return;
    }

    const newNotification = {
      id: 'notif_' + Date.now(),
      title: 'To ' + sendForm.recipient + ': ' + sendForm.title.trim(),
      message: sendForm.message.trim(),
      sender: 'Owner',
      recipient: sendForm.recipient,
      type: 'info',
      read: true,
      date: new Date().toISOString().split('T')[0],
    };

    onSendNotification(newNotification);
    setIsSendModalOpen(false);
    setSendForm({ recipient: 'Warden', title: '', message: '' });
    setSendError('');
  };

  return (
    <div>
      {/* Top Header Actions */}
      <div className="flex-between mb-20">
        <div className="flex-gap-12">
          <div className="text-sm text-muted">
            {unreadCount} unread of {notifications.length} total
          </div>
          {unreadCount > 0 && (
            <span className="badge notif-unread-count-badge">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex-gap-10">
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={onMarkAllRead}>
              <span className="material-icons icon-16 icon-middle">done_all</span>{' '}
              Mark All Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setIsClearAllModalOpen(true)}
            >
              <span className="material-icons icon-16 icon-middle">delete_sweep</span>{' '}
              Clear All
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={() => setIsSendModalOpen(true)}
          >
            <span className="material-icons icon-16 icon-middle">add</span>{' '}
            Send Notification
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-row">
        <button
          className={currentFilter === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setCurrentFilter('all')}
        >
          All ({notifications.length})
        </button>
        <button
          className={currentFilter === 'unread' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setCurrentFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={currentFilter === 'alert' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setCurrentFilter('alert')}
        >
          Alerts
        </button>
        <button
          className={currentFilter === 'success' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setCurrentFilter('success')}
        >
          Success
        </button>
        <button
          className={currentFilter === 'reminder' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => setCurrentFilter('reminder')}
        >
          Reminders
        </button>
      </div>

      {/* Notifications List */}
      <div id="notifList">
        {filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <span className="material-icons icon-48 icon-light">
                notifications_none
              </span>
            </div>
            <h3>No Notifications</h3>
            <p>You have no notifications in this category.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`notif-card ${!n.read ? 'unread' : ''} cursor-pointer`}
              id={`notif-${n.id}`}
              onClick={() => {
                if (!n.read) onMarkRead(n.id);
              }}
            >
              <div className="notif-body flex-1">
                <div className="flex-gap-8 mb-4">
                  <span className="badge badge-from-sys">
                    FROM: {n.sender || n.by || 'System'}
                  </span>
                  <div className="notif-title">{n.title}</div>
                </div>

                <div className="notif-msg">
                  {n.message || n.desc || n.msg || 'No details available.'}
                </div>

                <div className="notif-date">
                  <span className="material-icons icon-14 icon-middle">
                    calendar_today
                  </span>{' '}
                  {formatDate(n.date || n.sentAt)}
                </div>
              </div>

              <div className="notif-actions">
                <button
                  className="btn btn-secondary btn-sm btn-icon"
                  title="Delete notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingNotif(n);
                  }}
                >
                  <span className="material-icons icon-18">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Send Notification */}
      {isSendModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setIsSendModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">
                <span className="material-icons icon-22 icon-middle icon-mr-6">
                  campaign
                </span>{' '}
                Send Notification
              </span>
              <button
                className="modal-close"
                onClick={() => setIsSendModalOpen(false)}
              >
                ×
              </button>
            </div>

            {sendError && (
              <div className="alert-danger-sm">{sendError}</div>
            )}

            <form onSubmit={handleSendSubmit}>
              <div className="flex-col-gap-14">
                <div className="form-group">
                  <label className="form-label">
                    Recipient <span className="req">*</span>
                  </label>
                  <select
                    className="form-input"
                    value={sendForm.recipient}
                    onChange={(e) =>
                      setSendForm(
                        Object.assign({}, sendForm, { recipient: e.target.value })
                      )
                    }
                  >
                    <option value="Warden">Warden</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Title <span className="req">*</span>
                  </label>
                  <input
                    className="form-input"
                    placeholder="Enter notification title"
                    value={sendForm.title}
                    onChange={(e) =>
                      setSendForm(
                        Object.assign({}, sendForm, { title: e.target.value })
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Message <span className="req">*</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Message content"
                    value={sendForm.message}
                    onChange={(e) =>
                      setSendForm(
                        Object.assign({}, sendForm, { message: e.target.value })
                      )
                    }
                    required
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsSendModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <span className="material-icons icon-16 icon-middle">send</span>{' '}
                  Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Single Notification */}
      {deletingNotif && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setDeletingNotif(null);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Delete Notification</span>
              <button
                className="modal-close"
                onClick={() => setDeletingNotif(null)}
              >
                ×
              </button>
            </div>
            <p className="modal-desc-text">
              Are you sure you want to delete "<strong>{deletingNotif.title}</strong>"?
            </p>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeletingNotif(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onDeleteNotification(deletingNotif.id);
                  setDeletingNotif(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear All Notifications */}
      {isClearAllModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target.className === 'modal-overlay') setIsClearAllModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Clear All Notifications</span>
              <button
                className="modal-close"
                onClick={() => setIsClearAllModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="modal-desc-text">
              Are you sure you want to delete all notifications? This cannot be undone.
            </p>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setIsClearAllModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  onClearAllNotifications();
                  setIsClearAllModalOpen(false);
                }}
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
