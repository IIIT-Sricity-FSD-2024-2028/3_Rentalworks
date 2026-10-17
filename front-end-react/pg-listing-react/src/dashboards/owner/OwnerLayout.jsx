import React, { useState, useEffect, createContext, useContext } from 'react';
import { performLogout, getStoredUser } from '../../utils/auth';

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
  clearAllNotifications,
  getPolicy,
  updatePolicy,
  getProfile,
  updateProfile,
  getSubscription,
} from './services/api';

import './style.css';

// Map raw API property object to client schema
const mapProperty = (p) => ({
  id: p.id,
  images: p.images || [],
  description: p.description || '',
  name: p.name,
  address: p.address || p.location || '',
  city: p.city || '',
  state: p.state || '',
  pincode: p.pincode || '',
  type: p.type || 'Mixed',
  totalCapacity: p.totalCapacity ?? 0,
  totalRooms: p.totalRooms ?? 0,
  occupiedRooms: p.occupiedRooms ?? 0,
  monthlyRent: Number(p.monthlyRent ?? p.rentMin ?? 0),
  amenities: p.amenities || [],
  gender: p.gender || (p.type === 'Female' ? 'girls' : p.type === 'Male' ? 'boys' : 'unisex'),
  status: p.status === 'approved' ? 'Active' : p.status || 'Pending',
  addedDate: p.createdAt ? p.createdAt.split('T')[0] : '',
  owner: p.owner ? p.owner.name : '',
  ownerEmail: p.owner ? p.owner.email : '',
});

// Map raw API issue object to client schema
const mapIssue = (i) => ({
  id: i.id,
  propertyId: i.propertyId,
  propertyName: i.property ? i.property.name : '',
  title: i.title || i.description || 'Issue reported',
  description: i.description || '',
  category: i.category || 'Maintenance',
  priority: i.priority
    ? i.priority.charAt(0).toUpperCase() + i.priority.slice(1)
    : 'Medium',
  status:
    i.status === 'open'
      ? 'Open'
      : ['in-progress', 'in progress', 'in_progress'].includes(i.status)
      ? 'In Progress'
      : i.status === 'resolved' ? 'Resolved' : i.status || 'Unknown',
  reportedBy: i.reportedBy || (i.tenant ? i.tenant.name : 'Tenant'),
  reportedDate: i.reportedAt || '',
});

// Map raw API notification object to client schema
const mapNotification = (n) => ({
  id: n.id,
  title: n.title,
  message: n.message,
  type: n.type || 'reminder',
  read: Boolean(n.read || n.isRead),
  date: n.sentAt ? n.sentAt.split('T')[0] : '',
});


export const OwnerContext = createContext(null);
export function useOwner() { return useContext(OwnerContext); }

export default function OwnerLayout() {
  const [data, setData] = useState({ properties: [], issues: [], notifications: [], policy: {}, profile: {} });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [busy, setBusy] = useState(false);

  function showToast(message, type = 'success') {
    setToasts([{ id: Date.now(), message, type }]);
  }

  async function loadData() {
    const [properties, issues, notifications, policy, profile, subscription] = await Promise.all([
      getProperties(), getIssues(), getNotifications(), getPolicy(), getProfile(), getSubscription(),
    ]);
    setData({ properties: properties.map(mapProperty), issues: issues.map(mapIssue), notifications: notifications.map(mapNotification), policy, profile });
    setUser(Object.assign({}, profile, { subscriptionPlan: subscription.currentPlan, subscriptionFee: subscription.monthlyFee }));
    setError('');
  }

  useEffect(() => {
    const session = getStoredUser();
    if (!session || session.role !== 'owner' || !session.token) {
      window.location.replace('/login');
      return;
    }
    let active = true;
    async function refresh() {
      try { if (active) await loadData(); }
      catch (err) { if (active) setError(err.message); }
      finally { if (active) setLoading(false); }
    }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  // One write path: show success only after persistence; never save business data in storage.
  async function save(action, message) {
    setBusy(true);
    try {
      const res = await action();
      await loadData();
      showToast(message);
      return res !== false;
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function propertyPayload(p) {
    return {
      name: p.name, address: p.address, city: p.city, state: p.state, pincode: p.pincode,
      location: p.city + ', ' + p.state, type: p.type, gender: p.gender,
      totalCapacity: Number(p.totalCapacity), totalRooms: Number(p.totalRooms), occupiedRooms: Number(p.occupiedRooms),
      monthlyRent: Number(p.monthlyRent), rentMin: Number(p.monthlyRent), rentMax: Number(p.monthlyRent),
      rooms: p.occupiedRooms + '/' + p.totalRooms, amenities: p.amenities, description: p.description,
      images: p.images || [],
    };
  }

  const unreadNotifsCount = data.notifications.filter(n => !n.read).length;
  const openIssuesCount = data.issues.filter(i => i.status === 'Open').length;
  const handleLogout = performLogout;
  const contextValue = {
    data, user, unreadNotifsCount, openIssuesCount, handleLogout,
    handleAddProperty: p => save(() => createProperty(propertyPayload(p)), 'Property submitted for review'),
    handleUpdateProperty: p => save(() => updateProperty(p.id, propertyPayload(p)), 'Property updated'),
    handleDeleteProperty: id => save(() => deleteProperty(id), 'Property deleted'),
    handleAddIssue: i => save(() => createIssue({ propertyId: Number(i.propertyId), title: i.title, description: i.description, category: i.category, priority: i.priority.toLowerCase() }), 'Issue reported'),
    handleUpdateIssueStatus: (id, status) => save(() => updateIssueStatus(id, status.toLowerCase().replace(' ', '-')), 'Issue updated'),
    handleDeleteIssue: id => save(() => deleteIssue(id), 'Issue deleted'),
    handleMarkNotifRead: id => save(() => markNotificationRead(id), 'Notification marked as read'),
    handleMarkAllNotifsRead: () => save(markAllNotificationsRead, 'Notifications marked as read'),
    handleDeleteNotif: id => save(() => deleteNotification(id), 'Notification deleted'),
    handleClearAllNotifs: () => save(() => clearAllNotifications(), 'Notifications cleared'),
    handleSendNotif: n => save(() => createNotification({ title: n.title, message: n.message, type: 'info', priority: 'normal', targetRole: n.recipient.toLowerCase() }), 'Notification sent'),
    handleSavePolicy: policy => save(() => updatePolicy(policy), 'Policy saved'),
    handleResetPolicy: policy => save(() => updatePolicy(policy), 'Policy reset'),
    handleSaveProfile: profile => save(() => updateProfile(profile), 'Profile updated'),
  };

  if (loading) return <p role="status">Loading owner portal…</p>;
  if (!user) return <div role="alert">{error || 'Please sign in'} <button onClick={() => window.location.reload()}>Retry</button><a href="/login">Sign in</a></div>;
  return <OwnerContext.Provider value={contextValue}>
    <div className="portal-owner-scope">
      {error && <p role="alert">Data refresh failed: {error}</p>}
      <Toast toasts={toasts} onRemove={() => setToasts([])} />
      <div style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <Layout unreadNotifsCount={unreadNotifsCount} openIssuesCount={openIssuesCount} user={user} onLogout={handleLogout} />
      </div>
    </div>
  </OwnerContext.Provider>;
}

// Connected page route components that consume the OwnerContext
export function OwnerDashboardRoute() {
  const { data } = useOwner();
  return <Dashboard properties={data.properties} issues={data.issues} notifications={data.notifications} />;
}

export function OwnerPropertiesRoute() {
  const { data, handleUpdateProperty, handleDeleteProperty } = useOwner();
  return <Properties properties={data.properties} onUpdateProperty={handleUpdateProperty} onDeleteProperty={handleDeleteProperty} />;
}

export function OwnerAddPropertyRoute() {
  const { handleAddProperty } = useOwner();
  return <AddProperty onAddProperty={handleAddProperty} />;
}

export function OwnerIssuesRoute() {
  const { data, handleUpdateIssueStatus, handleDeleteIssue, handleAddIssue } = useOwner();
  return <Issues issues={data.issues} properties={data.properties} onUpdateIssueStatus={handleUpdateIssueStatus} onDeleteIssue={handleDeleteIssue} onAddIssue={handleAddIssue} />;
}

export function OwnerNotificationsRoute() {
  const { data, handleMarkNotifRead, handleMarkAllNotifsRead, handleDeleteNotif, handleClearAllNotifs, handleSendNotif } = useOwner();
  return <Notifications notifications={data.notifications} onMarkRead={handleMarkNotifRead} onMarkAllRead={handleMarkAllNotifsRead} onDeleteNotification={handleDeleteNotif} onClearAllNotifications={handleClearAllNotifs} onSendNotification={handleSendNotif} />;
}

export function OwnerPolicyRoute() {
  const { data, handleSavePolicy, handleResetPolicy } = useOwner();
  return <Policy policy={data.policy} onSavePolicy={handleSavePolicy} onResetPolicy={handleResetPolicy} />;
}

export function OwnerProfileRoute() {
  const { data, handleSaveProfile, handleLogout } = useOwner();
  return <Profile profile={data.profile} properties={data.properties} onSaveProfile={handleSaveProfile} onLogout={handleLogout} allData={data} />;
}

export function OwnerSubscriptionRoute() {
  const { user } = useOwner();
  return <Subscription user={user} />;
}
