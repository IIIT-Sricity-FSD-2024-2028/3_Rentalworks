import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import AddProperty from './pages/AddProperty';
import Issues from './pages/Issues';
import Notifications from './pages/Notifications';
import Policy from './pages/Policy';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';

import {
  loadOwnerData,
  selectOwner,
  selectOwnerUser,
  selectOwnerUnreadCount,
  selectOwnerOpenIssues,
  addOwnerProperty,
  updateOwnerProperty,
  deleteOwnerProperty,
  addOwnerIssue,
  updateOwnerIssueStatus,
  deleteOwnerIssue,
  markOwnerNotificationRead,
  markAllOwnerNotificationsRead,
  deleteOwnerNotification,
  clearOwnerNotifications,
  sendOwnerNotification,
  saveOwnerPolicy,
  resetOwnerPolicy,
  saveOwnerProfile,
  changeOwnerPassword,
} from '../../features/owner/ownerSlices';
import { logout } from '../../features/auth/authSlice';

import './style.css';

const REFRESH_MS = 30000;

/** Dispatch a mutation thunk and resolve to true/false like the old context API. */
const useAction = (thunk) => {
  const dispatch = useDispatch();
  return (arg) => dispatch(thunk(arg)).then((a) => !a.error);
};

const useOwnerLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };
};

export default function OwnerLayout() {
  const dispatch = useDispatch();
  const { status, error } = useSelector(selectOwner);
  const user = useSelector(selectOwnerUser);
  const unreadNotifsCount = useSelector(selectOwnerUnreadCount);
  const openIssuesCount = useSelector(selectOwnerOpenIssues);
  const handleLogout = useOwnerLogout();

  // Initial load + background refresh (every 30s and when the tab regains focus).
  useEffect(() => {
    const refresh = () => dispatch(loadOwnerData());
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [dispatch]);

  if (status === 'idle' || status === 'loading') return <p role="status" style={{ padding: 24 }}>Loading owner portal…</p>;
  if (status === 'failed') {
    return (
      <div role="alert" style={{ padding: 24 }}>
        <p>{error || 'Could not load the owner portal.'}</p>
        <button onClick={() => dispatch(loadOwnerData())}>Retry</button>{' '}
        <button onClick={handleLogout}>Sign in again</button>
      </div>
    );
  }

  return (
    <div className="portal-owner-scope">
      {error && <p role="alert">Data refresh failed: {error}</p>}
      <Layout unreadNotifsCount={unreadNotifsCount} openIssuesCount={openIssuesCount} user={user} onLogout={handleLogout} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route components: read from the Redux store and pass props to the pages.
// ---------------------------------------------------------------------------

export function OwnerDashboardRoute() {
  const { properties, issues, notifications } = useSelector(selectOwner);
  return <Dashboard properties={properties} issues={issues} notifications={notifications} />;
}

export function OwnerPropertiesRoute() {
  const { properties } = useSelector(selectOwner);
  return <Properties properties={properties} onUpdateProperty={useAction(updateOwnerProperty)} onDeleteProperty={useAction(deleteOwnerProperty)} />;
}

export function OwnerAddPropertyRoute() {
  return <AddProperty onAddProperty={useAction(addOwnerProperty)} />;
}

export function OwnerIssuesRoute() {
  const { issues, properties } = useSelector(selectOwner);
  const updateStatus = useAction(updateOwnerIssueStatus);
  return (
    <Issues
      issues={issues}
      properties={properties}
      onUpdateIssueStatus={(id, status) => updateStatus({ id, status })}
      onDeleteIssue={useAction(deleteOwnerIssue)}
      onAddIssue={useAction(addOwnerIssue)}
    />
  );
}

export function OwnerNotificationsRoute() {
  const { notifications } = useSelector(selectOwner);
  return (
    <Notifications
      notifications={notifications}
      onMarkRead={useAction(markOwnerNotificationRead)}
      onMarkAllRead={useAction(markAllOwnerNotificationsRead)}
      onDeleteNotification={useAction(deleteOwnerNotification)}
      onClearAllNotifications={useAction(clearOwnerNotifications)}
      onSendNotification={useAction(sendOwnerNotification)}
    />
  );
}

export function OwnerPolicyRoute() {
  const { policy } = useSelector(selectOwner);
  return <Policy policy={policy} onSavePolicy={useAction(saveOwnerPolicy)} onResetPolicy={useAction(resetOwnerPolicy)} />;
}

export function OwnerProfileRoute() {
  const dispatch = useDispatch();
  const owner = useSelector(selectOwner);
  const handleLogout = useOwnerLogout();
  return <Profile profile={owner.profile} properties={owner.properties} onSaveProfile={useAction(saveOwnerProfile)} onChangePassword={(arg) => dispatch(changeOwnerPassword(arg)).unwrap()} onLogout={handleLogout} allData={owner} />;
}

export function OwnerSubscriptionRoute() {
  const user = useSelector(selectOwnerUser);
  return <Subscription user={user} />;
}
