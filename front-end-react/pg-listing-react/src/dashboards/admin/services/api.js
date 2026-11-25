// ===================================================
//  services/api.js - Complete Admin API & Local Sync
//  Handles NestJS Backend REST endpoints + LocalStorage Sync
// ===================================================

const BASE = 'http://localhost:3000';

function getHeaders() {
  const userStr = sessionStorage.getItem('pg_user') || localStorage.getItem('pg_user');
  let token = '';
  try {
    const user = userStr ? JSON.parse(userStr) : null;
    if (user && user.token) token = user.token;
  } catch {}

  const headers = {
    'Content-Type': 'application/json',
    'x-role': 'admin',
    'x-user-id': '1',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function safeFetch(path, options = {}, fallback = []) {
  try {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const opts = {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) }
    };
    const res = await fetch(url, opts);
    if (!res.ok) {
      console.warn(`API ${opts.method || 'GET'} ${path} returned ${res.status}`);
      return fallback;
    }
    const data = await res.json();
    return data !== undefined && data !== null ? data : fallback;
  } catch (err) {
    console.warn(`API ${path} unreachable, using fallback:`, err.message);
    return fallback;
  }
}

// ===== LOCALSTORAGE SYNCHRONIZERS =====

function syncUsersWithLocal(userList = []) {
  try {
    const regGuests = JSON.parse(localStorage.getItem('registered_guests') || '[]');
    const regOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');
    const pendingSources = [...regGuests, ...regOwners];
    const merged = [...userList];

    pendingSources.forEach(u => {
      const exists = merged.find(existing => existing.email === u.email || existing.id === u.id);
      if (!exists) {
        merged.push({
          id: u.id || Date.now(),
          name: u.name || 'Unknown',
          email: u.email || '',
          phone: u.phone || '',
          role: u.role || (u.propertyName ? 'owner' : 'guest'),
          property: u.propertyName || '',
          status: u.status || 'active',
          joinDate: u.registeredOn || new Date().toISOString().split('T')[0],
          username: u.username || u.email
        });
      }
    });

    localStorage.setItem('admin_users', JSON.stringify(merged));
    return merged;
  } catch (e) {
    return userList;
  }
}

function syncPropertiesWithLocal(propList = []) {
  try {
    let pendingSources = [];
    const ownerData = JSON.parse(localStorage.getItem('pg_manager_data_storage') || 'null');
    if (ownerData && ownerData.properties) {
      pendingSources = pendingSources.concat(ownerData.properties);
    }
    const regOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');
    if (Array.isArray(regOwners)) {
      pendingSources = pendingSources.concat(regOwners);
    }

    const merged = [...propList];
    pendingSources.forEach(ownerProp => {
      const exists = merged.find(p => p.id === ownerProp.id || p.name === (ownerProp.name || ownerProp.propertyName));
      if (!exists) {
        merged.push({
          id: ownerProp.id || Date.now(),
          name: ownerProp.name || ownerProp.propertyName || 'Unknown Property',
          location: ownerProp.city || ownerProp.address || 'Unknown Location',
          owner: ownerProp.owner || 'Rajesh Kumar',
          ownerEmail: ownerProp.ownerEmail || 'rajesh.k@email.com',
          rentMin: ownerProp.monthlyRent || 5000,
          rentMax: ownerProp.monthlyRent ? ownerProp.monthlyRent + 3000 : 8000,
          safetyScore: 8.0,
          rooms: (ownerProp.occupiedRooms || 0) + '/' + (ownerProp.totalRooms || 10),
          occupancy: ownerProp.totalRooms ? Math.round(((ownerProp.occupiedRooms || 0) / ownerProp.totalRooms) * 100) : 0,
          amenities: ownerProp.amenities || ['WiFi', 'AC'],
          status: 'pending',
          docsVerified: false,
          inspectionPassed: false,
          commissionRate: 10,
          compliance: 'Pending',
          fireSafety: 'Pending',
          changeRequestPending: false
        });
      }
    });

    localStorage.setItem('admin_properties', JSON.stringify(merged));
    return merged;
  } catch (e) {
    return propList;
  }
}

function syncBookingsWithLocal(bookingList = []) {
  try {
    const merged = [...bookingList];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sunrise_pg_state_')) {
        const sunriseStateStr = localStorage.getItem(key);
        if (!sunriseStateStr) continue;
        const sunriseState = JSON.parse(sunriseStateStr);
        const guestBookings = sunriseState.bookings || [];

        guestBookings.forEach(gbk => {
          const existingIdx = merged.findIndex(b => b.id?.toString() === gbk.id?.toString());
          const payload = {
            id: gbk.id,
            tenant: gbk.user?.name || gbk.user || 'Guest Viewer',
            phone: gbk.user?.phone || gbk.user?.email || 'N/A',
            property: gbk.pg || 'Sunrise PG',
            room: gbk.room || 'Single',
            checkIn: gbk.date || '-',
            duration: gbk.duration || '11 Months',
            rent: gbk.rent || 0,
            status: gbk.status === 'confirmed' ? 'paid' : (gbk.status === 'approved' ? 'active' : gbk.status),
            _isSunrise: true,
            _sunriseKey: key
          };
          if (existingIdx > -1) {
            if (gbk.status !== 'approved' && gbk.status !== 'confirmed') {
              merged[existingIdx].status = payload.status;
            }
          } else {
            merged.unshift(payload);
          }
        });
      }
    }

    const wardenTenantsStr = localStorage.getItem('warden_tenants');
    if (wardenTenantsStr) {
      const wardenTenants = JSON.parse(wardenTenantsStr);
      wardenTenants.forEach(wt => {
        const existingIdx = merged.findIndex(b => b.id?.toString() === wt.id?.toString() || b.tenant === wt.name);
        const payload = {
          id: wt.id,
          tenant: wt.name,
          phone: wt.phone || 'N/A',
          property: 'Sunrise PG',
          room: wt.room || 'N/A',
          checkIn: wt.checkIn || '-',
          duration: '11 Months',
          rent: wt.rent || 0,
          status: 'active',
          _isWarden: true
        };
        if (existingIdx > -1) {
          merged[existingIdx].status = payload.status;
          merged[existingIdx].rent = payload.rent;
        } else {
          merged.push(payload);
        }
      });
    }

    localStorage.setItem('admin_bookings', JSON.stringify(merged));
    return merged;
  } catch (e) {
    return bookingList;
  }
}

function syncPaymentsWithLocal(payList = []) {
  try {
    const merged = [...payList];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sunrise_pg_state_')) {
        const sunriseStateStr = localStorage.getItem(key);
        if (!sunriseStateStr) continue;
        const sunriseState = JSON.parse(sunriseStateStr);
        const guestBookings = sunriseState.bookings || [];

        guestBookings.forEach(gbk => {
          if (gbk.status === 'confirmed' || gbk.status === 'approved') {
            const txnId = `TXN-${gbk.id}`;
            const existingIdx = merged.findIndex(p => p.id?.toString() === gbk.id?.toString() || p.transactionId === txnId);
            if (existingIdx === -1) {
              merged.unshift({
                id: gbk.id,
                tenant: gbk.user?.name || gbk.user || 'Guest Viewer',
                property: gbk.pg || 'Sunrise PG Residency',
                room: gbk.room || 'Single',
                amount: gbk.rent || 10000,
                method: 'UPI',
                transactionId: txnId,
                paidDate: gbk.date || new Date().toISOString().split('T')[0],
                status: 'verified',
                clearance: 'Approved'
              });
            }
          }
        });
      }
    }

    const localPayments = JSON.parse(localStorage.getItem('global_payments') || '[]');
    localPayments.forEach(lp => {
      if (!merged.find(m => m.id === lp.id || m.transactionId === lp.transactionId)) {
        merged.unshift(lp);
      }
    });

    localStorage.setItem('admin_payments', JSON.stringify(merged));
    return merged;
  } catch (e) {
    return payList;
  }
}

// ===== API EXPORTS =====

export const api = {
  // --- USERS ---
  getUsers: async () => {
    const local = JSON.parse(localStorage.getItem('admin_users') || '[]');
    const backendData = await safeFetch('/users', { method: 'GET' }, local);
    const users = Array.isArray(backendData) && backendData.length ? backendData : local;
    return syncUsersWithLocal(users);
  },

  createUser: async (userData) => {
    const cleanPayload = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      role: userData.role || 'tenant',
      username: userData.username || userData.email,
      password: userData.password || 'password123',
      ...(userData.region ? { region: userData.region } : {})
    };
    const created = await safeFetch('/users', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    }, null);

    const newUser = created || {
      id: Date.now(),
      ...cleanPayload,
      property: userData.property || '',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0]
    };

    const users = JSON.parse(localStorage.getItem('admin_users') || '[]');
    users.push(newUser);
    localStorage.setItem('admin_users', JSON.stringify(users));
    return newUser;
  },

  updateUser: async (id, userData) => {
    const cleanPayload = {
      ...(userData.name ? { name: userData.name } : {}),
      ...(userData.status ? { status: userData.status } : {}),
      ...(userData.email ? { email: userData.email } : {}),
      ...(userData.phone ? { phone: userData.phone } : {}),
      ...(userData.role ? { role: userData.role } : {}),
      ...(userData.region !== undefined ? { region: userData.region } : {})
    };

    await safeFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    }, null);

    // Update in local storage
    const users = JSON.parse(localStorage.getItem('admin_users') || '[]');
    const idx = users.findIndex(u => String(u.id) === String(id));
    if (idx > -1) {
      users[idx] = { ...users[idx], ...userData };
      localStorage.setItem('admin_users', JSON.stringify(users));
    }

    // Sync to Warden tenant records if tenant
    if (userData.role === 'tenant') {
      try {
        let wardenTenants = JSON.parse(localStorage.getItem('warden_tenants') || '[]');
        let matched = wardenTenants.find(t => t.name === userData.name || t.phone === userData.phone);
        if (matched) {
          matched.name = userData.name;
          matched.phone = userData.phone;
          localStorage.setItem('warden_tenants', JSON.stringify(wardenTenants));

          let crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
          crossNotifs.push({
            id: Date.now(),
            title: 'Tenant Profile Updated',
            message: `Admin has updated profile for tenant "${userData.name}".`,
            type: 'info',
            priority: 'routine',
            targetRole: 'warden',
            by: 'Admin',
            sentAt: new Date().toLocaleString()
          });
          localStorage.setItem('cross_notifications', JSON.stringify(crossNotifs));
        }
      } catch {}
    }

    return true;
  },

  deleteUser: async (id) => {
    await safeFetch(`/users/${id}`, { method: 'DELETE' }, null);

    let users = JSON.parse(localStorage.getItem('admin_users') || '[]');
    const user = users.find(u => String(u.id) === String(id));
    users = users.filter(u => String(u.id) !== String(id));
    localStorage.setItem('admin_users', JSON.stringify(users));

    if (user) {
      let regG = JSON.parse(localStorage.getItem('registered_guests') || '[]');
      regG = regG.filter(g => g.email !== user.email && g.id !== user.id);
      localStorage.setItem('registered_guests', JSON.stringify(regG));

      let regO = JSON.parse(localStorage.getItem('registered_owners') || '[]');
      regO = regO.filter(o => o.email !== user.email && o.id !== user.id);
      localStorage.setItem('registered_owners', JSON.stringify(regO));
    }
    return true;
  },

  // --- PROPERTIES ---
  getProperties: async () => {
    const local = JSON.parse(localStorage.getItem('admin_properties') || '[]');
    const backendData = await safeFetch('/properties', { method: 'GET' }, local);
    const props = Array.isArray(backendData) && backendData.length ? backendData : local;
    return syncPropertiesWithLocal(props);
  },

  createProperty: async (propData) => {
    const cleanPayload = {
      name: propData.name,
      location: propData.location,
      ownerId: Number(propData.ownerId) || 1,
      rentMin: Number(propData.rentMin) || 5000,
      rentMax: Number(propData.rentMax) || 8000,
      rooms: propData.rooms || '1/10',
      amenities: Array.isArray(propData.amenities) ? propData.amenities : ['WiFi']
    };

    const created = await safeFetch('/properties', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    }, null);

    const newProp = created || {
      id: Date.now(),
      ...cleanPayload,
      owner: propData.owner || 'Rajesh Kumar',
      safetyScore: 8.0,
      occupancy: 0,
      status: 'pending',
      docsVerified: false,
      inspectionPassed: false,
      commissionRate: 10,
      compliance: 'Pending',
      fireSafety: 'Pending'
    };

    const props = JSON.parse(localStorage.getItem('admin_properties') || '[]');
    props.push(newProp);
    localStorage.setItem('admin_properties', JSON.stringify(props));
    return newProp;
  },

  updateProperty: async (id, propData) => {
    const cleanPayload = {};
    if (propData.status !== undefined) cleanPayload.status = propData.status;
    if (propData.docsVerified !== undefined) cleanPayload.docsVerified = Boolean(propData.docsVerified);
    if (propData.inspectionPassed !== undefined) cleanPayload.inspectionPassed = Boolean(propData.inspectionPassed);
    if (propData.name !== undefined) cleanPayload.name = propData.name;
    if (propData.location !== undefined) cleanPayload.location = propData.location;
    if (propData.ownerId !== undefined) cleanPayload.ownerId = Number(propData.ownerId);
    if (propData.rentMin !== undefined) cleanPayload.rentMin = Number(propData.rentMin);
    if (propData.rentMax !== undefined) cleanPayload.rentMax = Number(propData.rentMax);
    if (propData.rooms !== undefined) cleanPayload.rooms = String(propData.rooms);

    await safeFetch(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    }, null);

    const props = JSON.parse(localStorage.getItem('admin_properties') || '[]');
    const idx = props.findIndex(p => String(p.id) === String(id));
    if (idx > -1) {
      props[idx] = { ...props[idx], ...propData };
      localStorage.setItem('admin_properties', JSON.stringify(props));
    }
    return true;
  },

  deleteProperty: async (id) => {
    await safeFetch(`/properties/${id}`, { method: 'DELETE' }, null);
    let props = JSON.parse(localStorage.getItem('admin_properties') || '[]');
    props = props.filter(p => String(p.id) !== String(id));
    localStorage.setItem('admin_properties', JSON.stringify(props));
    return true;
  },

  // --- BOOKINGS ---
  getBookings: async () => {
    const local = JSON.parse(localStorage.getItem('admin_bookings') || '[]');
    const backendData = await safeFetch('/bookings', { method: 'GET' }, local);
    const bks = Array.isArray(backendData) && backendData.length ? backendData : local;
    return syncBookingsWithLocal(bks);
  },

  updateBooking: async (id, bookingData) => {
    const cleanPayload = {};
    if (bookingData.status) cleanPayload.status = bookingData.status;
    if (bookingData.room) cleanPayload.room = bookingData.room;

    await safeFetch(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    }, null);

    let bookings = JSON.parse(localStorage.getItem('admin_bookings') || '[]');
    const b = bookings.find(x => String(x.id) === String(id));
    if (b) {
      Object.assign(b, bookingData);
      localStorage.setItem('admin_bookings', JSON.stringify(bookings));

      // Cross-platform sync
      if (b._isSunrise && b._sunriseKey) {
        try {
          const sState = JSON.parse(localStorage.getItem(b._sunriseKey) || '{}');
          if (bookingData.status === 'cancelled') {
            sState.bookings = (sState.bookings || []).filter(bk => String(bk.id) !== String(id));
          } else if (bookingData.status === 'active') {
            const sBk = (sState.bookings || []).find(bk => String(bk.id) === String(id));
            if (sBk) sBk.status = 'approved';
          }
          localStorage.setItem(b._sunriseKey, JSON.stringify(sState));
        } catch {}
      }
    }
    return true;
  },

  // --- PAYMENTS ---
  getPayments: async () => {
    const local = JSON.parse(localStorage.getItem('admin_payments') || '[]');
    const backendData = await safeFetch('/payments', { method: 'GET' }, local);
    const pays = Array.isArray(backendData) && backendData.length ? backendData : local;
    return syncPaymentsWithLocal(pays);
  },

  updatePayment: async (id, payData) => {
    const cleanPayload = {};
    if (payData.status) cleanPayload.status = payData.status;
    if (payData.clearance) cleanPayload.clearance = payData.clearance;

    await safeFetch(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    }, null);

    const payments = JSON.parse(localStorage.getItem('admin_payments') || '[]');
    const idx = payments.findIndex(p => String(p.id) === String(id));
    if (idx > -1) {
      payments[idx] = { ...payments[idx], ...payData };
      localStorage.setItem('admin_payments', JSON.stringify(payments));
      localStorage.setItem('global_payments', JSON.stringify(payments));
    }
    return true;
  },

  verifyPaymentAndGenerateCreds: async (id) => {
    await api.updatePayment(id, { status: 'verified', clearance: 'Approved' });

    const payments = JSON.parse(localStorage.getItem('admin_payments') || '[]');
    const p = payments.find(x => String(x.id) === String(id));
    if (p) {
      const cleanName = (typeof p.tenant === 'object' ? p.tenant.name : p.tenant || 'tenant')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const tenantUsername = cleanName + Math.floor(100 + Math.random() * 900);
      const tenantPassword = 'PG' + Math.floor(100000 + Math.random() * 900000);

      const creds = JSON.parse(localStorage.getItem('tenant_credentials') || '[]');
      creds.unshift({
        id: Date.now(),
        tenant: typeof p.tenant === 'object' ? p.tenant.name : p.tenant,
        property: typeof p.property === 'object' ? p.property.name : p.property,
        room: p.room,
        username: tenantUsername,
        password: tenantPassword,
        generatedAt: new Date().toLocaleString()
      });
      localStorage.setItem('tenant_credentials', JSON.stringify(creds));

      const notifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
      notifs.push({
        id: Date.now().toString(),
        type: 'credential',
        target: 'guest',
        message: `Payment Verified! Tenant Login Credentials for ${typeof p.property === 'object' ? p.property.name : p.property}: Username: ${tenantUsername} | Password: ${tenantPassword}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        by: 'Admin'
      });
      localStorage.setItem('cross_notifications', JSON.stringify(notifs));
    }
    return true;
  },

  // --- NOTIFICATIONS ---
  getNotifications: async () => {
    const local = JSON.parse(localStorage.getItem('admin_notifs') || '[]');
    const backendData = await safeFetch('/notifications', { method: 'GET' }, local);
    const notifs = Array.isArray(backendData) && backendData.length ? backendData : local;

    // Merge cross notifications
    const crossNotifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    const merged = [...local];
    notifs.forEach(n => {
      if (!merged.find(m => m.id === n.id)) merged.push(n);
    });
    crossNotifs.forEach(cn => {
      if (!merged.find(m => m.id === cn.id)) {
        merged.unshift({
          id: cn.id,
          title: cn.title || 'System Notification',
          message: cn.message,
          type: cn.type || 'announcement',
          priority: cn.priority || 'routine',
          recipients: 1,
          sentAt: cn.sentAt || new Date().toISOString()
        });
      }
    });

    localStorage.setItem('admin_notifs', JSON.stringify(merged));
    return merged;
  },

  createNotification: async (notifData) => {
    const cleanPayload = {
      title: notifData.title,
      message: notifData.message,
      type: notifData.type || 'announcement',
      priority: notifData.priority || 'routine',
      recipients: Number(notifData.recipients) || 1,
      byUserId: 1
    };

    const created = await safeFetch('/notifications', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    }, null);

    const newNotif = created || {
      id: Date.now(),
      ...cleanPayload,
      sentAt: notifData.sentAt || new Date().toISOString()
    };

    const notifs = JSON.parse(localStorage.getItem('admin_notifs') || '[]');
    notifs.unshift(newNotif);
    localStorage.setItem('admin_notifs', JSON.stringify(notifs));

    const cross = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
    cross.push({
      id: newNotif.id,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      priority: newNotif.priority,
      targetRole: notifData.targetRole || 'all',
      by: 'Admin',
      sentAt: new Date().toLocaleString()
    });
    localStorage.setItem('cross_notifications', JSON.stringify(cross));
    return newNotif;
  },

  deleteNotification: async (id) => {
    await safeFetch(`/notifications/${id}`, { method: 'DELETE' }, null);
    let notifs = JSON.parse(localStorage.getItem('admin_notifs') || '[]');
    notifs = notifs.filter(n => String(n.id) !== String(id));
    localStorage.setItem('admin_notifs', JSON.stringify(notifs));
    return true;
  },

  // --- SUBSCRIPTIONS ---
  getSubscriptionStats: async () => {
    const backendStats = await safeFetch('/subscriptions/admin/stats', { method: 'GET' }, null);
    if (backendStats && backendStats.subscriptions) {
      return backendStats;
    }

    // Dynamic fallback calculation matching traditional dashboard
    const props = JSON.parse(localStorage.getItem('admin_properties') || '[]');
    const regOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');
    const activeProps = props.filter(p => p.status === 'approved' || p.status === 'verified');
    
    let monthly = 0;
    let yearly = 0;
    let lifetime = 0;
    let totalRevenue = 0;

    regOwners.forEach(o => {
      const plan = (o.subscriptionPlan || 'YEARLY').toUpperCase();
      if (plan === 'MONTHLY') { monthly++; totalRevenue += 499; }
      else if (plan === 'LIFETIME') { lifetime++; totalRevenue += 14999; }
      else { yearly++; totalRevenue += 4999; }
    });

    if (regOwners.length === 0) {
      yearly = Math.max(1, activeProps.length);
      monthly = 1;
      lifetime = 1;
      totalRevenue = (yearly * 4999) + (monthly * 499) + (lifetime * 14999);
    }

    const totalActive = monthly + yearly + lifetime;
    return {
      subscriptions: { totalActive, monthly, yearly, lifetime },
      payments: { totalRevenue }
    };
  },

  getAllSubscriptions: async () => {
    const backendData = await safeFetch('/subscriptions/admin/all', { method: 'GET' }, null);
    if (Array.isArray(backendData) && backendData.length > 0) {
      return backendData;
    }

    // Dynamic generation from registered owners and properties
    const props = JSON.parse(localStorage.getItem('admin_properties') || '[]');
    const regOwners = JSON.parse(localStorage.getItem('registered_owners') || '[]');

    const list = [];
    regOwners.forEach((o, idx) => {
      const plan = (o.subscriptionPlan || (idx % 2 === 0 ? 'YEARLY' : 'MONTHLY')).toUpperCase();
      const fee = plan === 'MONTHLY' ? 499 : (plan === 'LIFETIME' ? 14999 : 4999);
      list.push({
        id: idx + 1,
        ownerId: o.id || (idx + 10),
        owner: { name: o.name || 'Owner ' + (idx + 1), email: o.email || 'owner@pgrentals.com' },
        planType: plan,
        plan: { displayName: `${plan.charAt(0) + plan.slice(1).toLowerCase()} Plan` },
        amount: fee,
        startDate: o.registeredOn || '2024-01-15',
        endDate: plan === 'LIFETIME' ? null : '2025-01-15',
        status: 'ACTIVE',
        evaluatedStatus: 'ACTIVE',
        receiptNumber: `REC-SUB-2024-${1000 + idx}`,
        paymentId: 100 + idx
      });
    });

    if (list.length === 0) {
      props.slice(0, 5).forEach((p, idx) => {
        const ownerName = typeof p.owner === 'object' ? p.owner.name : (p.owner || 'Rajesh Kumar');
        const plan = idx === 0 ? 'YEARLY' : (idx === 1 ? 'MONTHLY' : (idx === 2 ? 'LIFETIME' : 'YEARLY'));
        const fee = plan === 'MONTHLY' ? 499 : (plan === 'LIFETIME' ? 14999 : 4999);
        list.push({
          id: idx + 1,
          ownerId: idx + 1,
          owner: { name: ownerName, email: `${ownerName.toLowerCase().replace(/\s+/g, '.')}@email.com` },
          planType: plan,
          plan: { displayName: `${plan.charAt(0) + plan.slice(1).toLowerCase()} Plan` },
          amount: fee,
          startDate: '2024-02-01',
          endDate: plan === 'LIFETIME' ? null : '2025-02-01',
          status: 'ACTIVE',
          evaluatedStatus: 'ACTIVE',
          receiptNumber: `REC-SUB-2024-00${idx + 1}`,
          paymentId: 200 + idx
        });
      });
    }

    return list;
  },

  getSubscriptionReceipt: async (paymentId) => {
    const backendData = await safeFetch(`/subscriptions/payments/${paymentId}/receipt`, { method: 'GET' }, null);
    if (backendData) return backendData;

    return {
      receiptNumber: `REC-SUB-2024-${paymentId}`,
      planName: 'Yearly Subscription',
      planType: 'YEARLY',
      amount: 4999,
      billingCycle: '12 Months',
      issuedTo: 'Verified Property Owner',
      date: new Date().toLocaleDateString('en-IN'),
      platformFee: 0,
      paymentMethod: 'UPI / NetBanking',
      status: 'PAID'
    };
  }
};
