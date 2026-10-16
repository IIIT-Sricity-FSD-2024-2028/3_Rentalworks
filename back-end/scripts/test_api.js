const http = require('http');

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function testBackend() {
  console.log('Testing Backend API...');

  // 1. Login
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/users/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'owner1', password: 'owner123' });

  console.log('Login Status:', loginRes.status);
  const token = loginRes.data.access_token || loginRes.data.token;
  if (!token) {
    console.error('Failed to get token:', loginRes.data);
    return;
  }
  console.log('Got Auth Token successfully!');

  // 2. Test Properties Endpoint
  const propRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/properties',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-role': 'owner'
    }
  });
  console.log('Properties Status:', propRes.status);
  console.log('Found', propRes.data.length, 'properties');
  if (Array.isArray(propRes.data)) {
    propRes.data.forEach(p => {
      console.log(`- Property ${p.id} (${p.name}): ${p.images?.length || 0} images`);
    });
  }

  // 3. Test Subscription Endpoint
  const subRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/subscription',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-role': 'owner'
    }
  });
  console.log('Subscription Status:', subRes.status);
  console.log('Current plan:', subRes.data?.subscription?.planName || subRes.data?.currentPlan);
  console.log('Available plans:', subRes.data?.plans?.map(p => p.name));

  // 4. Test Notifications Endpoint
  const notifRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-role': 'owner'
    }
  });
  console.log('Notifications Status:', notifRes.status);
  console.log('Notifications count:', notifRes.data.length);
  if (Array.isArray(notifRes.data)) {
    notifRes.data.slice(0, 5).forEach(n => {
      console.log(`- [${n.type}] ${n.title} (From: ${n.byUser?.name || n.byUser?.username || 'System'}, To: ${n.targetRole || 'Owner'}, Priority: ${n.priority})`);
    });
  }

  // 5. Test Sending Notification (Owner -> Tenants / All Actors)
  const sendRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-role': 'owner'
    }
  }, {
    title: 'Water Tank Cleaning Notice',
    message: 'Water tank cleaning will take place tomorrow from 10 AM to 1 PM. Please store sufficient water.',
    type: 'announcement',
    priority: 'high',
    targetRole: 'tenant',
    targetPropertyId: 1
  });
  console.log('Send Notification to Tenants Status:', sendRes.status);
  console.log('Sent Notif Result:', sendRes.data?.title, 'ID:', sendRes.data?.id);

  // 6. Test Sending Notification to Warden
  const sendWardenRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/notifications',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-role': 'owner'
    }
  }, {
    title: 'Gate Pass Policy Update',
    message: 'Warden please verify late night entry log books every morning.',
    type: 'warden',
    priority: 'medium',
    targetRole: 'warden',
    targetPropertyId: 1
  });
  console.log('Send Notification to Warden Status:', sendWardenRes.status);
  console.log('Sent Warden Notif Result:', sendWardenRes.data?.title, 'ID:', sendWardenRes.data?.id);
}

testBackend().catch(console.error);
