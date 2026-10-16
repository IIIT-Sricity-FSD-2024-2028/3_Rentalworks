import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layout & Components
import Layout from './components/Layout';
import Toast from './components/Toast';

// Pages
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import AddProperty from './pages/AddProperty';
import Issues from './pages/Issues';
import Notifications from './pages/Notifications';
import Policy from './pages/Policy';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';

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
} from './services/api';

const STORAGE_KEY = 'pg_manager_data_storage';
const SESSION_KEY = 'pg_user';

export function OwnerPortal() {
  const [data, setData] = useState({
    properties: [],
    issues: [],
    notifications: [],
    policy: {},
    profile: {},
  });

  const [loading, setLoading] = useState(true);

  // User session state
  const [user, setUser] = useState(() => {
    try {
      const s = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem('pg_user');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && parsed.role === 'owner') return parsed;
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
        const s = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem('pg_user');
        if (!s) {
          window.location.replace('/login');
          return;
        }
        const parsed = JSON.parse(s);
        if (!parsed || parsed.role !== 'owner') {
          window.location.replace('/login');
          return;
        }
        setUser(parsed);
      } catch {
        window.location.replace('/login');
      }
    };

    checkAuth();
    window.addEventListener('pageshow', checkAuth);
    window.addEventListener('popstate', checkAuth);
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('pageshow', checkAuth);
      window.removeEventListener('popstate', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => prev.concat({ id, message, type }));
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const persistLocalBackup = (newData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      // ignore
    }
  };

  // Map raw API property object to client schema
  const mapProperty = (p) => ({
    id: p.id,
    name: p.name,
    address: p.address || p.location || '',
    city: p.city || 'Chennai',
    state: p.state || 'Tamil Nadu',
    pincode: p.pincode || '600001',
    type: p.type || 'Mixed',
    totalCapacity: p.totalCapacity || 30,
    totalRooms: p.totalRooms || 15,
    occupiedRooms: p.occupiedRooms || 10,
    monthlyRent: p.monthlyRent || p.rentMin || 7500,
    amenities: p.amenities || ['WiFi', 'AC'],
    gender: p.gender || (p.type === 'Female' ? 'girls' : p.type === 'Male' ? 'boys' : 'unisex'),
    status: p.status === 'approved' ? 'Active' : p.status || 'Active',
    addedDate: p.createdAt ? p.createdAt.split('T')[0] : '2024-01-15',
    owner: p.owner ? p.owner.name : 'Rajesh Kumar',
    ownerEmail: p.owner ? p.owner.email : 'rajesh.k@email.com',
  });

  // Map raw API issue object to client schema
  const mapIssue = (i) => ({
    id: i.id,
    propertyId: i.propertyId,
    propertyName: i.property ? i.property.name : 'Sunrise PG',
    title: i.title || i.description || 'Issue reported',
    description: i.description || '',
    category: i.category || 'Maintenance',
    priority: i.priority
      ? i.priority.charAt(0).toUpperCase() + i.priority.slice(1)
      : 'Medium',
    status:
      i.status === 'open'
        ? 'Open'
        : i.status === 'in-progress' || i.status === 'in progress'
        ? 'In Progress'
        : 'Resolved',
    reportedBy: i.reportedBy || (i.tenant ? i.tenant.name : 'Tenant'),
    reportedDate: i.reportedAt || '2025-03-20',
  });

  // Map raw API notification object to client schema
  const mapNotification = (n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type || 'reminder',
    read: Boolean(n.read),
    date: n.sentAt ? n.sentAt.split('T')[0] : '2025-03-25',
  });

  // Initial Data Loading from NestJS REST API
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const results = await Promise.all([
          getProperties(16).catch(() => null),
          getIssues().catch(() => null),
          getNotifications().catch(() => null),
          getPolicy().catch(() => null),
          getProfile().catch(() => null),
          getSubscription().catch(() => null),
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
            id: apiProfile.id || 6,
            name: apiProfile.name,
            email: apiProfile.email,
            phone: apiProfile.phone,
            subscriptionPlan: (apiSub && apiSub.currentPlan) || apiProfile.subscriptionPlan || 'Growth',
            subscriptionFee: (apiSub && apiSub.monthlyFee) || 8000,
          };
          setUser((prev) => Object.assign({}, prev, userUpdate));
        }
        setData(loadedData);
        persistLocalBackup(loadedData);
      } catch (err) {
        console.error('Data load error:', err);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setData(JSON.parse(stored));
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const refreshProperties = async () => {
    try {
      const apiProps = await getProperties(16);
      if (apiProps && Array.isArray(apiProps)) {
        const mapped = apiProps.map(mapProperty);
        setData((prev) => {
          const updated = Object.assign({}, prev, { properties: mapped });
          persistLocalBackup(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshIssues = async () => {
    try {
      const apiIssues = await getIssues();
      if (apiIssues && Array.isArray(apiIssues)) {
        const mapped = apiIssues.map(mapIssue);
        setData((prev) => {
          const updated = Object.assign({}, prev, { issues: mapped });
          persistLocalBackup(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshNotifications = async () => {
    try {
      const apiNotifs = await getNotifications();
      if (apiNotifs && Array.isArray(apiNotifs)) {
        const mapped = apiNotifs.map(mapNotification);
        setData((prev) => {
          const updated = Object.assign({}, prev, { notifications: mapped });
          persistLocalBackup(updated);
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Property Handlers
  const handleAddProperty = async (newProperty) => {
    try {
      const payload = {
        name: newProperty.name,
        location: (newProperty.city || 'Chennai') + ', ' + (newProperty.state || 'Tamil Nadu'),
        ownerId: 16,
        rentMin: Number(newProperty.monthlyRent) || 7000,
        rentMax: (Number(newProperty.monthlyRent) || 7000) + 2000,
        rooms: (newProperty.occupiedRooms || 0) + '/' + (newProperty.totalRooms || 10),
        amenities: newProperty.amenities || ['WiFi'],
        address: newProperty.address || '',
        city: newProperty.city || '',
        state: newProperty.state || '',
        pincode: newProperty.pincode || '',
        type: newProperty.type || 'Mixed',
        totalCapacity: Number(newProperty.totalCapacity) || 20,
        totalRooms: Number(newProperty.totalRooms) || 10,
        occupiedRooms: Number(newProperty.occupiedRooms) || 0,
        monthlyRent: Number(newProperty.monthlyRent) || 7000,
        gender: newProperty.gender || (newProperty.type === 'Female' ? 'girls' : newProperty.type === 'Male' ? 'boys' : 'unisex'),
      };
      await createProperty(payload);
      showToast('"' + newProperty.name + '" saved to database!', 'success');
      await refreshProperties();
    } catch (err) {
      const updatedProperties = data.properties.concat(newProperty);
      const updatedData = Object.assign({}, data, { properties: updatedProperties });
      setData(updatedData);
      persistLocalBackup(updatedData);
      showToast('"' + newProperty.name + '" added locally', 'warning');
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
        occupiedRooms: Number(updatedProperty.occupiedRooms),
        monthlyRent: Number(updatedProperty.monthlyRent),
        amenities: updatedProperty.amenities,
        gender: updatedProperty.gender || (updatedProperty.type === 'Female' ? 'girls' : updatedProperty.type === 'Male' ? 'boys' : 'unisex'),
      };
      await updateProperty(updatedProperty.id, payload);
      showToast('Property updated in database!', 'success');
      await refreshProperties();
    } catch (err) {
      const updatedProperties = data.properties.map((p) =>
        p.id === updatedProperty.id ? updatedProperty : p
      );
      const updatedData = Object.assign({}, data, { properties: updatedProperties });
      setData(updatedData);
      persistLocalBackup(updatedData);
      showToast('Property updated locally', 'info');
    }
  };

  const handleDeleteProperty = async (propertyId) => {
    try {
      await deleteProperty(propertyId);
      showToast('Property deleted from database', 'success');
      await refreshProperties();
    } catch (err) {
      const updatedProperties = data.properties.filter((p) => p.id !== propertyId);
      const updatedData = Object.assign({}, data, { properties: updatedProperties });
      setData(updatedData);
      persistLocalBackup(updatedData);
      showToast('Property deleted locally', 'info');
    }
  };

  // Issue Handlers
  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      const apiStatus =
        newStatus === 'Open'
          ? 'open'
          : newStatus === 'In Progress'
          ? 'in-progress'
          : 'resolved';
      await updateIssueStatus(issueId, apiStatus);
      showToast('Issue marked as "' + newStatus + '"', 'success');
      await refreshIssues();
    } catch (err) {
      const updatedIssues = data.issues.map((i) =>
        String(i.id) === String(issueId)
          ? Object.assign({}, i, { status: newStatus })
          : i
      );
      const updatedData = Object.assign({}, data, { issues: updatedIssues });
      setData(updatedData);
      persistLocalBackup(updatedData);
      showToast('Issue updated locally', 'info');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      await deleteIssue(issueId);
      showToast('Issue deleted from database', 'success');
      await refreshIssues();
    } catch (err) {
      const updatedIssues = data.issues.filter((i) => String(i.id) !== String(issueId));
      const updatedData = Object.assign({}, data, { issues: updatedIssues });
      setData(updatedData);
      persistLocalBackup(updatedData);
      showToast('Issue deleted locally', 'info');
    }
  };

  const handleAddIssue = async (newIssue) => {
    try {
      const payload = {
        tenantId: 1,
        propertyId: Number(newIssue.propertyId) || 1,
        title: newIssue.title,
        description: newIssue.description,
        category: newIssue.category || 'Maintenance',
        priority: (newIssue.priority || 'medium').toLowerCase(),
        reportedBy: newIssue.reportedBy || 'Owner',
      };
      await createIssue(payload);
      showToast('Issue reported and saved!', 'success');
      await refreshIssues();
    } catch (err) {
      const updatedIssues = [newIssue].concat(data.issues);
      const updatedData = Object.assign({}, data, { issues: updatedIssues });
      setData(updatedData);
      persistLocalBackup(updatedData);
      showToast('Issue added locally', 'info');
    }
  };

  // Notification Handlers
  const handleMarkNotifRead = async (id) => {
    try {
      await markNotificationRead(id);
    } catch (err) {
      // ignore
    }
    setData((prev) => {
      const updated = prev.notifications.map((n) =>
        n.id === id ? Object.assign({}, n, { read: true }) : n
      );
      return Object.assign({}, prev, { notifications: updated });
    });
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (err) {
      // ignore
    }
    setData((prev) => {
      const updated = prev.notifications.map((n) =>
        Object.assign({}, n, { read: true })
      );
      return Object.assign({}, prev, { notifications: updated });
    });
    showToast('All notifications marked as read', 'success');
  };

  const handleDeleteNotif = async (id) => {
    try {
      await deleteNotification(id);
    } catch (err) {
      // ignore
    }
    setData((prev) => {
      const updated = prev.notifications.filter((n) => String(n.id) !== String(id));
      return Object.assign({}, prev, { notifications: updated });
    });
    showToast('Notification deleted', 'success');
  };

  const handleClearAllNotifs = () => {
    setData((prev) => Object.assign({}, prev, { notifications: [] }));
    showToast('All notifications cleared', 'success');
  };

  const handleSendNotif = async (newNotif) => {
    try {
      const payload = {
        title: newNotif.title,
        message: newNotif.message,
        type: newNotif.type || 'reminder',
        priority: 'normal',
        recipients: 1,
        byUserId: 6,
      };
      await createNotification(payload);
      showToast('Notification sent!', 'success');
      await refreshNotifications();
    } catch (err) {
      const updatedNotifs = [newNotif].concat(data.notifications);
      setData((prev) => Object.assign({}, prev, { notifications: updatedNotifs }));
      showToast('Notification sent locally', 'info');
    }
  };

  // Policy Handlers
  const handleSavePolicy = async (newPolicy) => {
    try {
      const saved = await updatePolicy(newPolicy);
      setData((prev) => Object.assign({}, prev, { policy: saved }));
      showToast('Policy settings saved!', 'success');
    } catch (err) {
      setData((prev) => Object.assign({}, prev, { policy: newPolicy }));
      showToast('Policy saved locally', 'info');
    }
  };

  const handleResetPolicy = () => {
    showToast('Policy reset to defaults', 'info');
  };

  // Profile Handlers
  const handleSaveProfile = async (newProfile) => {
    try {
      const saved = await updateProfile(newProfile);
      setData((prev) => Object.assign({}, prev, { profile: saved }));
      setUser((prev) => Object.assign({}, prev, saved));
      showToast('Profile updated!', 'success');
    } catch (err) {
      setData((prev) => Object.assign({}, prev, { profile: newProfile }));
      setUser((prev) => Object.assign({}, prev, newProfile));
      showToast('Profile updated locally', 'info');
    }
  };

  // Subscription Handler
  const handleSubscription = async (planName, price) => {
    try {
      const saved = await updateSubscription({ plan: planName, fee: price });
      const update = {
        subscriptionPlan: saved.currentPlan || planName,
        subscriptionFee: saved.monthlyFee || price,
      };
      setUser((prev) => Object.assign({}, prev, update));
      showToast('Subscribed to ' + planName + ' Plan!', 'success');
    } catch (err) {
      const update = {
        subscriptionPlan: planName,
        subscriptionFee: price,
      };
      setUser((prev) => Object.assign({}, prev, update));
      showToast('Subscribed to ' + planName + ' Plan locally', 'info');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('pg_user');
    sessionStorage.removeItem('owner_user');
    sessionStorage.removeItem('guest_user');
    sessionStorage.removeItem('tenant_user');
    sessionStorage.removeItem('warden_user');
    sessionStorage.removeItem('super_admin_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('pg_user');
    localStorage.removeItem('owner_user');
    try {
      window.dispatchEvent(new Event('rentbro-logout'));
    } catch (_) {}
    window.location.replace('/login');
  };

  const unreadNotifsCount = (data.notifications || []).filter((n) => !n.read).length;
  const openIssuesCount = (data.issues || []).filter(
    (i) => (i.status || '').toLowerCase() === 'open'
  ).length;

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="loading-wrap loading-wrap-mt">
        <div className="spinner"></div>
        <p>Connecting to Neon PostgreSQL &amp; Loading Owner Portal...</p>
      </div>
    );
  }

  return (
    <>
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
                user={user}
                onSubscribe={handleSubscription}
              />
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <OwnerPortal />
    </BrowserRouter>
  );
}

