const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-role': options.role || 'tenant',
        'x-user-id': options.userId || '1',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          body = data;
        }
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=====================================================');
  console.log('   TENANT DASHBOARD APIS - AUTOMATED INTEGRATION TEST ');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, details = '') {
    if (condition) {
      passed++;
      console.log(`✅ PASS: ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      failed++;
      console.log(`❌ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
    }
  }

  try {
    // 1. ISSUES APIS
    console.log('\n--- 1. Testing Issues APIs ---');

    // POST /issues
    const createIssueRes = await request('/issues', {
      method: 'POST',
      role: 'tenant',
      userId: '1',
      body: {
        title: 'Leaking Bathroom Tap',
        description: 'Bathroom tap is dripping continuously in room 101.',
        category: 'Plumbing',
        priority: 'high',
        location: 'Room 101 Bathroom',
        propertyId: 1,
        roomId: 1,
      },
    });
    assert(
      'POST /issues',
      createIssueRes.status === 201 && createIssueRes.body?.id,
      `Created ID: ${createIssueRes.body?.id}, Title: ${createIssueRes.body?.title}`,
    );

    const issueId = createIssueRes.body?.id;

    // GET /issues/my
    const getMyIssuesRes = await request('/issues/my', {
      role: 'tenant',
      userId: '1',
    });
    assert(
      'GET /issues/my',
      getMyIssuesRes.status === 200 &&
        Array.isArray(getMyIssuesRes.body) &&
        getMyIssuesRes.body.some((i) => i.id === issueId),
      `Total Tenant Issues: ${getMyIssuesRes.body?.length}`,
    );

    // GET /issues/:id
    const getIssueByIdRes = await request(`/issues/${issueId}`, {
      role: 'tenant',
      userId: '1',
    });
    assert(
      'GET /issues/:id',
      getIssueByIdRes.status === 200 && getIssueByIdRes.body?.id === issueId,
      `Status: ${getIssueByIdRes.body?.status}`,
    );

    // PATCH /issues/:id
    const patchIssueRes = await request(`/issues/${issueId}`, {
      method: 'PATCH',
      role: 'tenant',
      userId: '1',
      body: {
        priority: 'urgent',
        description: 'Dripping has increased, urgent fix requested.',
      },
    });
    assert(
      'PATCH /issues/:id',
      patchIssueRes.status === 200 && patchIssueRes.body?.priority === 'urgent',
      `New Priority: ${patchIssueRes.body?.priority}`,
    );

    // DELETE /issues/:id
    const deleteIssueRes = await request(`/issues/${issueId}`, {
      method: 'DELETE',
      role: 'tenant',
      userId: '1',
    });
    assert(
      'DELETE /issues/:id',
      deleteIssueRes.status === 200,
      `Deleted ID: ${deleteIssueRes.body?.id}`,
    );

    // 2. SERVICE REQUESTS APIS
    console.log('\n--- 2. Testing Service Requests APIs ---');

    // POST /service-requests
    const createServiceRes = await request('/service-requests', {
      method: 'POST',
      role: 'tenant',
      userId: '1',
      body: {
        serviceType: 'Laundry',
        serviceName: 'Laundry',
        description: 'Wash and press 3 shirts and 2 pants',
        amount: 50,
        propertyId: 1,
        roomId: 1,
      },
    });
    assert(
      'POST /service-requests',
      createServiceRes.status === 201 && createServiceRes.body?.id,
      `Created ID: ${createServiceRes.body?.id}, Service: ${createServiceRes.body?.serviceName}`,
    );

    const serviceRequestId = createServiceRes.body?.id;

    // GET /service-requests/my
    const getMyServicesRes = await request('/service-requests/my', {
      role: 'tenant',
      userId: '1',
    });
    assert(
      'GET /service-requests/my',
      getMyServicesRes.status === 200 &&
        Array.isArray(getMyServicesRes.body) &&
        getMyServicesRes.body.some((s) => s.id === serviceRequestId),
      `Total Requests: ${getMyServicesRes.body?.length}`,
    );

    // GET /service-requests/:id
    const getServiceByIdRes = await request(`/service-requests/${serviceRequestId}`, {
      role: 'tenant',
      userId: '1',
    });
    assert(
      'GET /service-requests/:id',
      getServiceByIdRes.status === 200 && getServiceByIdRes.body?.id === serviceRequestId,
      `Status: ${getServiceByIdRes.body?.status}`,
    );

    // PATCH /service-requests/:id
    const patchServiceRes = await request(`/service-requests/${serviceRequestId}`, {
      method: 'PATCH',
      role: 'tenant',
      userId: '1',
      body: {
        status: 'in_progress',
        notes: 'Clothes picked up from room 101',
      },
    });
    assert(
      'PATCH /service-requests/:id',
      patchServiceRes.status === 200 && patchServiceRes.body?.status === 'in_progress',
      `New Status: ${patchServiceRes.body?.status}`,
    );

    // DELETE /service-requests/:id
    const deleteServiceRes = await request(`/service-requests/${serviceRequestId}`, {
      method: 'DELETE',
      role: 'tenant',
      userId: '1',
    });
    assert(
      'DELETE /service-requests/:id',
      deleteServiceRes.status === 200,
      `Deleted ID: ${deleteServiceRes.body?.id}`,
    );

    // 3. NOTIFICATIONS APIS
    console.log('\n--- 3. Testing Notifications APIs ---');

    // Create a sample notification for tenant 1
    const createNotifRes = await request('/notifications', {
      method: 'POST',
      role: 'admin',
      userId: '1',
      body: {
        title: 'Monthly Rent Reminder',
        message: 'Your rent for the current month is due in 3 days.',
        type: 'rent_reminder',
        priority: 'high',
        userId: 1,
      },
    });

    // GET /notifications
    const getNotifsRes = await request('/notifications', {
      role: 'tenant',
      userId: '1',
    });
    assert(
      'GET /notifications',
      getNotifsRes.status === 200 && Array.isArray(getNotifsRes.body) && getNotifsRes.body.length > 0,
      `Total Notifications: ${getNotifsRes.body?.length}`,
    );

    const testNotifId = getNotifsRes.body[0]?.id;

    // PATCH /notifications/:id/read
    if (testNotifId) {
      const patchReadRes = await request(`/notifications/${testNotifId}/read`, {
        method: 'PATCH',
        role: 'tenant',
        userId: '1',
      });
      assert(
        'PATCH /notifications/:id/read',
        patchReadRes.status === 200 && patchReadRes.body?.isRead === true,
        `Notification ID: ${testNotifId} marked as read`,
      );
    }

    // PATCH /notifications/read-all
    const patchReadAllRes = await request('/notifications/read-all', {
      method: 'PATCH',
      role: 'tenant',
      userId: '1',
    });
    assert(
      'PATCH /notifications/read-all',
      patchReadAllRes.status === 200 && patchReadAllRes.body?.success === true,
      `Result: ${patchReadAllRes.body?.message}`,
    );

    console.log('\n=====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err.message);
    process.exit(1);
  }
}

// Give server time to respond if running
runTests();
