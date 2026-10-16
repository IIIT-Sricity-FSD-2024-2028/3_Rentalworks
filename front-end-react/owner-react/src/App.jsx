import { ownerClasses } from "./classes";
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout & Components
import Layout from "./components/Layout";
import Toast from "./components/Toast";

// Pages
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import AddProperty from "./pages/AddProperty";
import Issues from "./pages/Issues";
import Notifications from "./pages/Notifications";
import Policy from "./pages/Policy";
import Profile from "./pages/Profile";
import Subscription from "./pages/Subscription";

// API Service
import {
  getProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getIssues,
  updateIssueStatus,
  createIssue,
  deleteIssue,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  deleteNotification,
  getPolicy,
  updatePolicy,
  getProfile,
  updateProfile,
  getSubscription,
  updateSubscription,
} from "./services/api";

const SESSION_KEY = "pg_user";

export function OwnerPortal() {
  const [data, setData] = useState({
    properties: [],
    issues: [],
    notifications: [],
    policy: {},
    profile: {},
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // User session state
  const [user, setUser] = useState(() => {
    try {
      const s =
        sessionStorage.getItem(SESSION_KEY) ||
        sessionStorage.getItem("pg_user");
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && parsed.role === "owner" && parsed.token)
          return { id: parsed.id, role: parsed.role, token: parsed.token };
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  // Guard: Verify authentication on mount, bfcache restore, and browser history navigation
  useEffect(() => {
    const checkAuth = () => {
      try {
        const s =
          sessionStorage.getItem(SESSION_KEY) ||
          sessionStorage.getItem("pg_user");
        if (!s) {
          window.location.replace("/login");
          return;
        }
        const parsed = JSON.parse(s);
        if (!parsed || parsed.role !== "owner" || !parsed.token) {
          window.location.replace("/login");
          return;
        }
        setUser((previous) =>
          previous?.id === parsed.id
            ? previous
            : { id: parsed.id, role: parsed.role, token: parsed.token },
        );
      } catch {
        window.location.replace("/login");
      }
    };

    checkAuth();
    window.addEventListener("pageshow", checkAuth);
    window.addEventListener("popstate", checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener("pageshow", checkAuth);
      window.removeEventListener("popstate", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => prev.concat({ id, message, type }));
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Map raw API property object to client schema
  const mapProperty = (p) => ({
    id: p.id,
    name: p.name,
    address: p.address || p.location || "",
    city: p.city || "",
    state: p.state || "",
    pincode: p.pincode || "",
    type:
      p.type ||
      { girls: "Female", boys: "Male", unisex: "Mixed" }[p.gender] ||
      "Not specified",
    images: Array.isArray(p.images) ? p.images : [],
    description: p.description || "",
    hasRoomRecords: Boolean(p.hasRoomRecords),
    totalOccupants: p.totalOccupants ?? null,
    capacityWarning: Boolean(p.capacityWarning),
    estimatedMonthlyRent: p.estimatedMonthlyRent ?? null,
    totalCapacity: p.totalCapacity ?? 0,
    totalRooms: p.totalRooms ?? 0,
    occupiedRooms: p.occupiedRooms ?? 0,
    monthlyRent: p.monthlyRent ?? p.rentMin ?? 0,
    amenities: p.amenities || [],
    gender:
      p.gender ||
      (p.type === "Female" ? "girls" : p.type === "Male" ? "boys" : "unisex"),
    status: p.status === "approved" ? "Active" : p.status || "Not specified",
    addedDate: p.createdAt ? p.createdAt.split("T")[0] : "",
    owner: p.owner?.name || "",
    ownerEmail: p.owner?.email || "",
  });

  // Map raw API issue object to client schema
  const mapIssue = (i) => ({
    id: i.id,
    propertyId: i.propertyId,
    propertyName: i.property?.name || "",
    title: i.title || i.description || "Issue reported",
    description: i.description || "",
    category: i.category || "Uncategorized",
    priority: i.priority
      ? i.priority.charAt(0).toUpperCase() + i.priority.slice(1)
      : "Medium",
    status:
      i.status === "open"
        ? "Open"
        : i.status === "in-progress" || i.status === "in progress"
          ? "In Progress"
          : "Resolved",
    reportedBy: i.reportedBy || (i.tenant ? i.tenant.name : "Tenant"),
    reportedDate: i.reportedAt || "",
  });

  // Map raw API notification object to client schema
  const mapNotification = (n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type || "reminder",
    priority: n.priority || "normal",
    read: Boolean(n.read || n.isRead),
    targetRole: n.targetRole || "all",
    sender: n.byUser?.name || (n.byUserId === user?.id ? "You (Owner)" : "System"),
    senderRole: n.byUser?.role || (n.byUserId === user?.id ? "owner" : "system"),
    date: n.sentAt ? n.sentAt.split("T")[0] : n.createdAt ? n.createdAt.split("T")[0] : "",
  });

  // Initial Data Loading from NestJS REST API
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const results = await Promise.all([
          getProperties(),
          getIssues(),
          getNotifications(),
          getPolicy(),
          getProfile(),
          getSubscription(),
        ]);

        const apiProps = results[0];
        const apiIssues = results[1];
        const apiNotifs = results[2];
        const apiPolicy = results[3];
        const apiProfile = results[4];
        const apiSub = results[5];

        let loadedData = {
          properties: [],
          issues: [],
          notifications: [],
          policy: {},
          profile: {},
        };

        if (apiProps && Array.isArray(apiProps) && apiProps.length > 0) {
          loadedData.properties = apiProps.map(mapProperty);
        }
        if (apiIssues && Array.isArray(apiIssues)) {
          loadedData.issues = apiIssues.map(mapIssue);
        }
        if (apiNotifs && Array.isArray(apiNotifs)) {
          loadedData.notifications = apiNotifs.map(mapNotification);
        }
        if (apiPolicy && Object.keys(apiPolicy).length > 0) {
          loadedData.policy = apiPolicy;
        }
        if (apiProfile && apiProfile.name) {
          loadedData.profile = apiProfile;
          const userUpdate = {
            id: apiProfile.id,
            name: apiProfile.name,
            email: apiProfile.email,
            phone: apiProfile.phone,
            subscriptionPlan: apiSub?.currentPlan || "No active subscription",
            subscriptionFee: apiSub?.monthlyFee ?? 0,
          };
          setUser((prev) => Object.assign({}, prev, userUpdate));
        }
        loadedData.subscription = apiSub;
        setData(loadedData);
      } catch (err) {
        setLoadError(err.message || "Could not load owner data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshProperties = async () => {
    try {
      const apiProps = await getProperties();
      if (apiProps && Array.isArray(apiProps)) {
        const mapped = apiProps.map(mapProperty);
        setData((prev) => {
          const updated = Object.assign({}, prev, { properties: mapped });
          return updated;
        });
      }
    } catch (err) {
      throw err;
    }
  };

  const refreshIssues = async () => {
    try {
      const apiIssues = await getIssues();
      if (apiIssues && Array.isArray(apiIssues)) {
        const mapped = apiIssues.map(mapIssue);
        setData((prev) => {
          const updated = Object.assign({}, prev, { issues: mapped });
          return updated;
        });
      }
    } catch (err) {
      throw err;
    }
  };

  const refreshNotifications = async () => {
    try {
      const apiNotifs = await getNotifications();
      if (apiNotifs && Array.isArray(apiNotifs)) {
        const mapped = apiNotifs.map(mapNotification);
        setData((prev) => {
          const updated = Object.assign({}, prev, { notifications: mapped });
          return updated;
        });
      }
    } catch (err) {
      throw err;
    }
  };

  // Property Handlers
  const handleAddProperty = async (newProperty) => {
    try {
      const payload = {
        name: newProperty.name,
        location: newProperty.city + ", " + newProperty.state,
        ownerId: user.id,
        rentMin: Number(newProperty.monthlyRent),
        rentMax: Number(newProperty.monthlyRent),
        description: newProperty.description || "",
        images: newProperty.images || [],
        amenities: newProperty.amenities,
        address: newProperty.address || "",
        city: newProperty.city || "",
        state: newProperty.state || "",
        pincode: newProperty.pincode || "",
        type: newProperty.type || "Mixed",
        totalCapacity: Number(newProperty.totalCapacity),
        totalRooms: Number(newProperty.totalRooms),
        rooms: String(newProperty.totalRooms || 1),
        occupiedRooms: Number(newProperty.occupiedRooms),
        monthlyRent: Number(newProperty.monthlyRent),
        gender:
          newProperty.gender ||
          (newProperty.type === "Female"
            ? "girls"
            : newProperty.type === "Male"
              ? "boys"
              : "unisex"),
      };
      await createProperty(payload);
      showToast('"' + newProperty.name + '" saved to database!', "success");
      await refreshProperties();
    } catch (err) {
      showToast(err.message || "Could not add property", "error");
      throw err;
    }
  };

  const handleUpdateProperty = async (updatedProperty) => {
    try {
      const payload = {
        name: updatedProperty.name,
        address: updatedProperty.address,
        city: updatedProperty.city,
        state: updatedProperty.state,
        pincode: updatedProperty.pincode,
        type: updatedProperty.type,
        totalCapacity: Number(updatedProperty.totalCapacity),
        totalRooms: Number(updatedProperty.totalRooms),
        rooms: String(updatedProperty.totalRooms || 1),
        occupiedRooms: Number(updatedProperty.occupiedRooms),
        monthlyRent: Number(updatedProperty.monthlyRent),
        amenities: updatedProperty.amenities,
        images: (updatedProperty.images || []).map(url => url.trim()).filter(Boolean),
        gender:
          updatedProperty.gender ||
          (updatedProperty.type === "Female"
            ? "girls"
            : updatedProperty.type === "Male"
              ? "boys"
              : "unisex"),
      };
      await updateProperty(updatedProperty.id, payload);
      showToast("Property updated in database!", "success");
      await refreshProperties();
      return true;
    } catch (err) {
      showToast(err.message || "Could not update property", "error");
      return false;
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
      await deleteProperty(propertyId);
      showToast("Property deleted from database", "success");
      await refreshProperties();
    } catch (err) {
      showToast(err.message || "Could not delete property", "error");
    }
  };

  // Issue Handlers
  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      const apiStatus =
        newStatus === "Open"
          ? "open"
          : newStatus === "In Progress"
            ? "in-progress"
            : "resolved";
      await updateIssueStatus(issueId, apiStatus);
      showToast('Issue marked as "' + newStatus + '"', "success");
      await refreshIssues();
    } catch (err) {
      showToast(err.message || "Could not update issue", "error");
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      await deleteIssue(issueId);
      showToast("Issue deleted from database", "success");
      await refreshIssues();
    } catch (err) {
      showToast(err.message || "Could not delete issue", "error");
    }
  };

  const handleAddIssue = async (newIssue) => {
    try {
      const payload = {
        tenantId: user.id,
        propertyId: Number(newIssue.propertyId),
        title: newIssue.title,
        description: newIssue.description,
        category: newIssue.category || "Maintenance",
        priority: (newIssue.priority || "medium").toLowerCase(),
        reportedBy: newIssue.reportedBy || "Owner",
      };
      await createIssue(payload);
      showToast("Issue reported and saved!", "success");
      await refreshIssues();
      return true;
    } catch (err) {
      showToast(err.message || "Could not report issue", "error");
      return false;
    }
  };

  // Notification Handlers
  const handleMarkNotifRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      showToast(err.message || "Could not mark notification as read", "error");
      return;
    }
    setData((prev) => {
      const updated = prev.notifications.map((n) =>
        n.id === id ? Object.assign({}, n, { read: true }) : n,
      );
      return Object.assign({}, prev, { notifications: updated });
    });
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (err) {
      showToast(err.message || "Could not mark notifications as read", "error");
      return;
    }
    setData((prev) => {
      const updated = prev.notifications.map((n) =>
        Object.assign({}, n, { read: true }),
      );
      return Object.assign({}, prev, { notifications: updated });
    });
    showToast("All notifications marked as read", "success");
  };

  const handleDeleteNotif = async (id) => {
    try {
      await deleteNotification(id);
    } catch (err) {
      showToast(err.message || "Could not delete notification", "error");
      return;
    }
    setData((prev) => {
      const updated = prev.notifications.filter(
        (n) => String(n.id) !== String(id),
      );
      return Object.assign({}, prev, { notifications: updated });
    });
    showToast("Notification deleted", "success");
  };

  const handleClearAllNotifs = async () => {
    try {
      await Promise.all(
        data.notifications.map((notification) =>
          deleteNotification(notification.id),
        ),
      );
      await refreshNotifications();
      showToast("All notifications cleared", "success");
    } catch (err) {
      showToast(err.message || "Could not clear notifications", "error");
      await refreshNotifications();
    }
  };

  const handleSendNotif = async (newNotif) => {
    try {
      const payload = {
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type || "reminder",
        priority: newNotif.priority || "normal",
        recipients: 1,
        byUserId: user.id,
        targetRole: (newNotif.targetRole || newNotif.recipient || "all").toLowerCase(),
      };
      await createNotification(payload);
      showToast("Notification sent to " + (newNotif.recipient || "actors") + "!", "success");
      await refreshNotifications();
      return true;
    } catch (err) {
      showToast(err.message || "Could not send notification", "error");
      return false;
    }
  };

  // Policy Handlers
  const handleSavePolicy = async (newPolicy) => {
    try {
      const saved = await updatePolicy(newPolicy);
      setData((prev) => Object.assign({}, prev, { policy: saved }));
      showToast("Policy settings saved!", "success");
    } catch (err) {
      showToast(err.message || "Could not save policy", "error");
    }
  };

  const handleResetPolicy = async () => {
    try {
      const saved = await getPolicy();
      setData((prev) => ({ ...prev, policy: saved }));
      showToast("Saved policy reloaded", "success");
      return true;
    } catch (err) {
      showToast(err.message || "Could not reset policy", "error");
      return false;
    }
  };

  // Profile Handlers
  const handleSaveProfile = async (newProfile) => {
    try {
      const { name, email, phone, company, city, state, pincode, bio, avatar } =
        newProfile;
      const saved = await updateProfile({
        name,
        email,
        phone,
        company,
        city,
        state,
        pincode,
        bio,
        avatar,
      });
      setData((prev) => Object.assign({}, prev, { profile: saved }));
      setUser((prev) => Object.assign({}, prev, saved));
      showToast("Profile updated!", "success");
    } catch (err) {
      showToast(err.message || "Could not update profile", "error");
    }
  };

  // Subscription Handler
  const handleSubscription = async (planId) => {
    try {
      await updateSubscription({ planId });
      const subscription = await getSubscription();
      setData((previous) => ({ ...previous, subscription }));
      showToast(
        "Plan request submitted. Activation requires payment confirmation.",
        "success",
      );
      return true;
    } catch (err) {
      showToast(err.message || "Could not update subscription", "error");
      return false;
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("pg_user");
    sessionStorage.removeItem("owner_user");
    sessionStorage.removeItem("guest_user");
    sessionStorage.removeItem("tenant_user");
    sessionStorage.removeItem("warden_user");
    sessionStorage.removeItem("super_admin_token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("pg_user");
    localStorage.removeItem("owner_user");
    try {
      window.dispatchEvent(new Event("rentbro-logout"));
    } catch (_) {}
    window.location.replace("/login");
  };

  const unreadNotifsCount = (data.notifications || []).filter(
    (n) => !n.read,
  ).length;
  const openIssuesCount = (data.issues || []).filter(
    (i) => (i.status || "").toLowerCase() === "open",
  ).length;

  if (!user) {
    return null;
  }

  if (loadError)
    return (
      <div className={ownerClasses("portal")}>
        <div className={ownerClasses("empty-state")} role="alert">
          <h2>Owner data could not be loaded</h2>
          <p>{loadError}</p>
          <button
            className={ownerClasses("btn btn-primary")}
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );

  if (loading) {
    return (
      <div className={ownerClasses("portal loading-wrap loading-wrap-mt")}>
        <div className={ownerClasses("spinner")}></div>
        <p>Loading your owner portal...</p>
      </div>
    );
  }

  return (
    <div className={ownerClasses("portal")}>
      <Toast toasts={toasts} onRemove={removeToast} />

      <Routes>
        <Route
          path="/"
          element={
            <Layout
              unreadNotifsCount={unreadNotifsCount}
              openIssuesCount={openIssuesCount}
              user={user}
              onLogout={handleLogout}
            />
          }
        >
          <Route
            index
            element={
              <Dashboard
                properties={data.properties}
                issues={data.issues}
                notifications={data.notifications}
              />
            }
          />

          <Route
            path="properties"
            element={
              <Properties
                properties={data.properties}
                onUpdateProperty={handleUpdateProperty}
                onDeleteProperty={handleDeleteProperty}
              />
            }
          />

          <Route
            path="add-property"
            element={<AddProperty onAddProperty={handleAddProperty} />}
          />

          <Route
            path="issues"
            element={
              <Issues
                issues={data.issues}
                properties={data.properties}
                onUpdateIssueStatus={handleUpdateIssueStatus}
                onDeleteIssue={handleDeleteIssue}
                onAddIssue={handleAddIssue}
              />
            }
          />

          <Route
            path="notifications"
            element={
              <Notifications
                notifications={data.notifications}
                onMarkRead={handleMarkNotifRead}
                onMarkAllRead={handleMarkAllNotifsRead}
                onDeleteNotification={handleDeleteNotif}
                onClearAllNotifications={handleClearAllNotifs}
                onSendNotification={handleSendNotif}
              />
            }
          />

          <Route
            path="policy"
            element={
              <Policy
                policy={data.policy}
                onSavePolicy={handleSavePolicy}
                onResetPolicy={handleResetPolicy}
              />
            }
          />

          <Route
            path="profile"
            element={
              <Profile
                profile={data.profile}
                properties={data.properties}
                onSaveProfile={handleSaveProfile}
                onLogout={handleLogout}
                allData={data}
              />
            }
          />

          <Route
            path="subscription"
            element={
              <Subscription
                subscription={data.subscription}
                user={user}
                onSubscribe={handleSubscription}
              />
            }
          />
        </Route>
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/owner" replace />} />
        <Route path="/owner/*" element={<OwnerPortal />} />
      </Routes>
    </BrowserRouter>
  );
}
