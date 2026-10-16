import { ownerClasses } from "../classes";
import Icon from "../components/Icon";
import React, { useState } from "react";

// Notifications: View, filter, mark read, send messages, and clear alerts
export default function Notifications({
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDeleteNotification,
  onClearAllNotifications,
  onSendNotification,
}) {
  const [currentFilter, setCurrentFilter] = useState("all");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [deletingNotif, setDeletingNotif] = useState(null);

  const [sendForm, setSendForm] = useState({
    recipient: "All",
    type: "info",
    priority: "normal",
    title: "",
    message: "",
  });
  const [sendError, setSendError] = useState("");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (currentFilter === "unread") return !n.read;
    if (currentFilter !== "all") return (n.type || "").toLowerCase() === currentFilter.toLowerCase();
    return true;
  });

  const handleSendSubmit = async (e) => {
    e.preventDefault();
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      setSendError("Please fill in both title and message.");
      return;
    }

    const targetRoleMap = {
      All: "all",
      Tenants: "tenant",
      Warden: "warden",
      Admin: "admin",
      "Super Admin": "super_admin",
    };

    const newNotification = {
      title: sendForm.title.trim(),
      message: sendForm.message.trim(),
      type: sendForm.type || "info",
      priority: sendForm.priority || "normal",
      recipient: sendForm.recipient,
      targetRole: targetRoleMap[sendForm.recipient] || sendForm.recipient.toLowerCase(),
      date: new Date().toISOString().split("T")[0],
    };

    if (!(await onSendNotification(newNotification))) return;
    setIsSendModalOpen(false);
    setSendForm({
      recipient: "All",
      type: "info",
      priority: "normal",
      title: "",
      message: "",
    });
    setSendError("");
  };

  return (
    <div>
      {/* Top Header Actions */}
      <div className={ownerClasses("flex-between mb-20")}>
        <div className={ownerClasses("flex-gap-12")}>
          <div className={ownerClasses("text-sm text-muted")}>
            {unreadCount} unread of {notifications.length} total
          </div>
          {unreadCount > 0 && (
            <span className={ownerClasses("badge notif-unread-count-badge")}>
              {unreadCount} new
            </span>
          )}
        </div>

        <div className={ownerClasses("flex-gap-10")}>
          {unreadCount > 0 && (
            <button
              className={ownerClasses("btn btn-secondary")}
              onClick={onMarkAllRead}
            >
              <Icon className={ownerClasses("icon-16 icon-middle")}>
                done_all
              </Icon>{" "}
              Mark All Read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              className={ownerClasses("btn btn-danger btn-sm")}
              onClick={() => setIsClearAllModalOpen(true)}
            >
              <Icon className={ownerClasses("icon-16 icon-middle")}>
                delete_sweep
              </Icon>{" "}
              Clear All
            </button>
          )}

          <button
            className={ownerClasses("btn btn-primary")}
            onClick={() => setIsSendModalOpen(true)}
          >
            <Icon className={ownerClasses("icon-16 icon-middle")}>add</Icon>{" "}
            Send Notification
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={ownerClasses("filter-tabs-row")}>
        <button
          className={ownerClasses(
            currentFilter === "all"
              ? "btn btn-primary btn-sm"
              : "btn btn-secondary btn-sm",
          )}
          onClick={() => setCurrentFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          className={ownerClasses(
            currentFilter === "unread"
              ? "btn btn-primary btn-sm"
              : "btn btn-secondary btn-sm",
          )}
          onClick={() => setCurrentFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
        <button
          className={ownerClasses(
            currentFilter === "alert"
              ? "btn btn-primary btn-sm"
              : "btn btn-secondary btn-sm",
          )}
          onClick={() => setCurrentFilter("alert")}
        >
          Alerts
        </button>
        <button
          className={ownerClasses(
            currentFilter === "issue"
              ? "btn btn-primary btn-sm"
              : "btn btn-secondary btn-sm",
          )}
          onClick={() => setCurrentFilter("issue")}
        >
          Issues
        </button>
        <button
          className={ownerClasses(
            currentFilter === "reminder"
              ? "btn btn-primary btn-sm"
              : "btn btn-secondary btn-sm",
          )}
          onClick={() => setCurrentFilter("reminder")}
        >
          Reminders
        </button>
        <button
          className={ownerClasses(
            currentFilter === "info"
              ? "btn btn-primary btn-sm"
              : "btn btn-secondary btn-sm",
          )}
          onClick={() => setCurrentFilter("info")}
        >
          Info
        </button>
      </div>

      {/* Notifications List */}
      <div id="notifList">
        {filteredNotifications.length === 0 ? (
          <div className={ownerClasses("empty-state")}>
            <div className={ownerClasses("empty-icon")}>
              <Icon className={ownerClasses("icon-48 icon-light")}>
                notifications_none
              </Icon>
            </div>
            <h3>No Notifications</h3>
            <p>You have no notifications in this category.</p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={ownerClasses(
                `notif-card ${!n.read ? "unread" : ""} cursor-pointer`,
              )}
              id={`notif-${n.id}`}
              onClick={() => {
                if (!n.read) onMarkRead(n.id);
              }}
            >
              <div className={ownerClasses("notif-body flex-1")}>
                <div
                  className={ownerClasses("flex-gap-8 mb-4")}
                  style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}
                >
                  <span
                    className={ownerClasses("badge")}
                    style={{
                      background: n.senderRole === "warden" ? "#e0e7ff" : n.senderRole === "super_admin" ? "#fef3c7" : n.senderRole === "owner" ? "#dbeafe" : "#f1f5f9",
                      color: n.senderRole === "warden" ? "#4338ca" : n.senderRole === "super_admin" ? "#b45309" : n.senderRole === "owner" ? "#1d4ed8" : "#475569",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    FROM: {n.sender || "System"}
                  </span>

                  {n.targetRole && (
                    <span
                      className={ownerClasses("badge")}
                      style={{
                        background: "#f8fafc",
                        color: "#64748b",
                        fontSize: "11px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      TO: {n.targetRole.toUpperCase()}
                    </span>
                  )}

                  {n.priority && n.priority !== "normal" && (
                    <span
                      className={ownerClasses("badge")}
                      style={{
                        background: n.priority === "urgent" || n.priority === "high" ? "#fee2e2" : "#fef3c7",
                        color: n.priority === "urgent" || n.priority === "high" ? "#b91c1c" : "#b45309",
                        fontSize: "11px",
                      }}
                    >
                      {n.priority.toUpperCase()}
                    </span>
                  )}

                  <div className={ownerClasses("notif-title")} style={{ marginLeft: "4px" }}>
                    {n.title}
                  </div>
                </div>

                <div className={ownerClasses("notif-msg")}>
                  {n.message || n.desc || n.msg || "No details available."}
                </div>

                <div className={ownerClasses("notif-date")}>
                  <Icon className={ownerClasses("icon-14 icon-middle")}>
                    calendar_today
                  </Icon>{" "}
                  {formatDate(n.date || n.sentAt)}
                </div>
              </div>

              <div className={ownerClasses("notif-actions")}>
                <button
                  className={ownerClasses("btn btn-secondary btn-sm btn-icon")}
                  title="Delete notification"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingNotif(n);
                  }}
                >
                  <Icon className={ownerClasses("icon-18")}>delete</Icon>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Send Notification */}
      {isSendModalOpen && (
        <div
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSendModalOpen(false);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                <Icon className={ownerClasses("icon-22 icon-middle icon-mr-6")}>
                  campaign
                </Icon>{" "}
                Send Notification
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setIsSendModalOpen(false)}
              >
                ×
              </button>
            </div>

            {sendError && (
              <div className={ownerClasses("alert-danger-sm")}>{sendError}</div>
            )}

            <form onSubmit={handleSendSubmit}>
              <div className={ownerClasses("flex-col-gap-14")}>
                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Recipient <span className={ownerClasses("req")}>*</span>
                  </label>
                  <select
                    className={ownerClasses("form-input")}
                    value={sendForm.recipient}
                    onChange={(e) =>
                      setSendForm(
                        Object.assign({}, sendForm, {
                          recipient: e.target.value,
                        }),
                      )
                    }
                  >
                    <option value="All">All Actors (Broadcast to Everyone)</option>
                    <option value="Tenants">Tenants (All Residents)</option>
                    <option value="Warden">Warden (Hostel In-charge)</option>
                    <option value="Admin">Regional Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>Type</label>
                    <select
                      className={ownerClasses("form-input")}
                      value={sendForm.type}
                      onChange={(e) =>
                        setSendForm(
                          Object.assign({}, sendForm, { type: e.target.value })
                        )
                      }
                    >
                      <option value="info">Information</option>
                      <option value="alert">Alert</option>
                      <option value="reminder">Reminder</option>
                      <option value="warning">Warning</option>
                    </select>
                  </div>

                  <div className={ownerClasses("form-group")}>
                    <label className={ownerClasses("form-label")}>Priority</label>
                    <select
                      className={ownerClasses("form-input")}
                      value={sendForm.priority}
                      onChange={(e) =>
                        setSendForm(
                          Object.assign({}, sendForm, { priority: e.target.value })
                        )
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Title <span className={ownerClasses("req")}>*</span>
                  </label>
                  <input
                    className={ownerClasses("form-input")}
                    placeholder="Enter notification title"
                    value={sendForm.title}
                    onChange={(e) =>
                      setSendForm(
                        Object.assign({}, sendForm, { title: e.target.value }),
                      )
                    }
                    required
                  />
                </div>

                <div className={ownerClasses("form-group")}>
                  <label className={ownerClasses("form-label")}>
                    Message <span className={ownerClasses("req")}>*</span>
                  </label>
                  <textarea
                    className={ownerClasses("form-input")}
                    rows="3"
                    placeholder="Type your message here..."
                    value={sendForm.message}
                    onChange={(e) =>
                      setSendForm(
                        Object.assign({}, sendForm, {
                          message: e.target.value,
                        }),
                      )
                    }
                    required
                  ></textarea>
                </div>
              </div>

              <div className={ownerClasses("modal-footer")}>
                <button
                  type="button"
                  className={ownerClasses("btn btn-secondary")}
                  onClick={() => setIsSendModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={ownerClasses("btn btn-primary")}
                >
                  <Icon className={ownerClasses("icon-16 icon-middle")}>
                    send
                  </Icon>{" "}
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
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingNotif(null);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                Delete Notification
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setDeletingNotif(null)}
              >
                ×
              </button>
            </div>
            <p className={ownerClasses("modal-desc-text")}>
              Are you sure you want to delete "
              <strong>{deletingNotif.title}</strong>"?
            </p>
            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setDeletingNotif(null)}
              >
                Cancel
              </button>
              <button
                className={ownerClasses("btn btn-danger")}
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
          className={ownerClasses("modal-overlay")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsClearAllModalOpen(false);
          }}
        >
          <div className={ownerClasses("modal")}>
            <div className={ownerClasses("modal-header")}>
              <span className={ownerClasses("modal-title")}>
                Clear All Notifications
              </span>
              <button
                className={ownerClasses("modal-close")}
                onClick={() => setIsClearAllModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className={ownerClasses("modal-desc-text")}>
              Are you sure you want to delete all notifications? This cannot be
              undone.
            </p>
            <div className={ownerClasses("modal-footer")}>
              <button
                className={ownerClasses("btn btn-secondary")}
                onClick={() => setIsClearAllModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={ownerClasses("btn btn-danger")}
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
