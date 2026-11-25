const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-role': options.role || 'super_admin',
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
  console.log('==============================================');
  console.log('   RENTALWORKS BACKEND API COMPREHENSIVE TEST  ');
  console.log('==============================================\n');

  const results = [];
  function assert(name, condition, details = '') {
    results.push({ name, passed: !!condition, details });
    console.log(`${condition ? '✅ PASS' : '❌ FAIL'}: ${name} ${details ? '(' + details + ')' : ''}`);
  }

  try {
    // 1. USERS
    console.log('\n--- 1. Testing Users API ---');
    const usersGet = await request('/users', { role: 'admin' });
    assert('GET /users', usersGet.status === 200 && Array.isArray(usersGet.body), `Count: ${usersGet.body?.length}`);

    const userGetOne = await request('/users/1', { role: 'tenant' });
    assert('GET /users/:id', userGetOne.status === 200 && userGetOne.body.id === 1, `Name: ${userGetOne.body?.name}`);

    const userLogin = await request('/users/login', {
      method: 'POST',
      body: { username: 'tenant1', password: 'password123' },
    });
    assert('POST /users/login', userLogin.status === 201 && userLogin.body.id === 1, `Role: ${userLogin.body?.role}`);

    const testUser = await request('/users', {
      method: 'POST',
      role: 'admin',
      body: {
        name: 'Test Temp User',
        email: `tempuser_${Date.now()}@example.com`,
        phone: '+91 99999 88888',
        role: 'tenant',
        username: `temp_${Date.now()}`,
        password: 'password123',
      },
    });
    assert('POST /users', testUser.status === 201 && testUser.body.id, `Created ID: ${testUser.body?.id}`);

    if (testUser.body?.id) {
      const userUpdate = await request(`/users/${testUser.body.id}`, {
        method: 'PUT',
        role: 'tenant',
        body: { phone: '+91 99999 77777', address: '123 New Street' },
      });
      assert('PUT /users/:id', userUpdate.status === 200 && userUpdate.body.phone === '+91 99999 77777');

      const userDel = await request(`/users/${testUser.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /users/:id', userDel.status === 200);
    }

    // 2. PROPERTIES
    console.log('\n--- 2. Testing Properties API ---');
    const propsGet = await request('/properties');
    assert('GET /properties', propsGet.status === 200 && Array.isArray(propsGet.body), `Count: ${propsGet.body?.length}`);

    const propGetOne = await request('/properties/1');
    assert('GET /properties/:id', propGetOne.status === 200 && propGetOne.body.id === 1, `Name: ${propGetOne.body?.name}`);

    const testProp = await request('/properties', {
      method: 'POST',
      role: 'owner',
      body: {
        name: 'Temp Property',
        location: 'Goa',
        ownerId: 4,
        rentMin: 4000,
        rentMax: 8000,
        rooms: '1/2',
        amenities: ['WiFi'],
        gender: 'unisex',
      },
    });
    assert('POST /properties', testProp.status === 201 && testProp.body.id, `Created ID: ${testProp.body?.id}`);

    if (testProp.body?.id) {
      const propUpdate = await request(`/properties/${testProp.body.id}`, {
        method: 'PUT',
        role: 'owner',
        body: { description: 'Updated test description' },
      });
      assert('PUT /properties/:id', propUpdate.status === 200);

      const propDel = await request(`/properties/${testProp.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /properties/:id', propDel.status === 200);
    }

    // 3. ROOMS
    console.log('\n--- 3. Testing Rooms API ---');
    const roomsGet = await request('/rooms');
    assert('GET /rooms', roomsGet.status === 200 && Array.isArray(roomsGet.body), `Count: ${roomsGet.body?.length}`);

    const roomsPropFilter = await request('/rooms?propertyId=1');
    assert('GET /rooms?propertyId=1', roomsPropFilter.status === 200 && Array.isArray(roomsPropFilter.body));

    const roomGetOne = await request('/rooms/1');
    assert('GET /rooms/:id', roomGetOne.status === 200 && roomGetOne.body.id === 1, `Room: ${roomGetOne.body?.roomNumber}`);

    const testRoom = await request('/rooms', {
      method: 'POST',
      role: 'owner',
      body: {
        roomNumber: `T-${Date.now().toString().slice(-4)}`,
        propertyId: 1,
        capacity: 2,
        currentOccupancy: 0,
        rent: 9000,
        status: 'available',
        roomType: 'double',
      },
    });
    assert('POST /rooms', testRoom.status === 201 && testRoom.body.id, `Created ID: ${testRoom.body?.id}`);

    if (testRoom.body?.id) {
      const roomUpdate = await request(`/rooms/${testRoom.body.id}`, {
        method: 'PUT',
        role: 'owner',
        body: { rent: 9500 },
      });
      assert('PUT /rooms/:id', roomUpdate.status === 200 && Number(roomUpdate.body.rent) === 9500);

      const roomDel = await request(`/rooms/${testRoom.body.id}`, { method: 'DELETE', role: 'owner' });
      assert('DELETE /rooms/:id', roomDel.status === 200);
    }

    // 4. BOOKINGS
    console.log('\n--- 4. Testing Bookings API ---');
    const bookingsGet = await request('/bookings', { role: 'tenant' });
    assert('GET /bookings', bookingsGet.status === 200 && Array.isArray(bookingsGet.body), `Count: ${bookingsGet.body?.length}`);

    const bookingsUserFilter = await request('/bookings?userId=1', { role: 'tenant' });
    assert('GET /bookings?userId=1', bookingsUserFilter.status === 200 && bookingsUserFilter.body.every(b => b.tenantId === 1));

    const testBooking = await request('/bookings', {
      method: 'POST',
      role: 'tenant',
      body: {
        tenantId: 1,
        propertyId: 1,
        roomId: 1,
        room: '101',
        checkIn: '2026-06-01',
        duration: '6 months',
        rent: 8000,
      },
    });
    assert('POST /bookings', testBooking.status === 201 && testBooking.body.id, `Created ID: ${testBooking.body?.id}`);

    if (testBooking.body?.id) {
      const bookingUpdate = await request(`/bookings/${testBooking.body.id}`, {
        method: 'PUT',
        role: 'warden',
        body: { status: 'confirmed' },
      });
      assert('PUT /bookings/:id', bookingUpdate.status === 200 && bookingUpdate.body.status === 'confirmed');

      const bookingDel = await request(`/bookings/${testBooking.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /bookings/:id', bookingDel.status === 200);
    }

    // 5. BOOKING REQUESTS
    console.log('\n--- 5. Testing Booking Requests API ---');
    const bookingReqsGet = await request('/booking-requests', { role: 'tenant' });
    assert('GET /booking-requests', bookingReqsGet.status === 200 && Array.isArray(bookingReqsGet.body), `Count: ${bookingReqsGet.body?.length}`);

    const testBookingReq = await request('/booking-requests', {
      method: 'POST',
      role: 'tenant',
      body: {
        tenantId: 1,
        propertyId: 1,
        roomId: 1,
        requestedDate: '2026-07-01',
        message: 'Looking for a clean room',
      },
    });
    assert('POST /booking-requests', testBookingReq.status === 201 && testBookingReq.body.id, `Created ID: ${testBookingReq.body?.id}`);

    if (testBookingReq.body?.id) {
      const bookingReqUpdate = await request(`/booking-requests/${testBookingReq.body.id}`, {
        method: 'PUT',
        role: 'warden',
        body: { status: 'approved' },
      });
      assert('PUT /booking-requests/:id', bookingReqUpdate.status === 200 && bookingReqUpdate.body.status === 'approved');

      const bookingReqDel = await request(`/booking-requests/${testBookingReq.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /booking-requests/:id', bookingReqDel.status === 200);
    }

    // 6. TENANT STAYS
    console.log('\n--- 6. Testing Tenant Stays API ---');
    const staysGet = await request('/tenant-stays', { role: 'tenant' });
    assert('GET /tenant-stays', staysGet.status === 200 && Array.isArray(staysGet.body), `Count: ${staysGet.body?.length}`);

    const testStay = await request('/tenant-stays', {
      method: 'POST',
      role: 'warden',
      body: {
        tenantId: 1,
        propertyId: 1,
        roomId: 1,
        moveInDate: '2026-06-01',
        status: 'active',
      },
    });
    assert('POST /tenant-stays', testStay.status === 201 && testStay.body.id, `Created ID: ${testStay.body?.id}`);

    if (testStay.body?.id) {
      const stayUpdate = await request(`/tenant-stays/${testStay.body.id}`, {
        method: 'PUT',
        role: 'warden',
        body: { moveOutDate: '2026-12-01' },
      });
      assert('PUT /tenant-stays/:id', stayUpdate.status === 200 && stayUpdate.body.moveOutDate === '2026-12-01');

      const stayDel = await request(`/tenant-stays/${testStay.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /tenant-stays/:id', stayDel.status === 200);
    }

    // 7. PAYMENTS & REVENUE
    console.log('\n--- 7. Testing Payments & Revenue API ---');
    const paymentsGet = await request('/payments', { role: 'tenant' });
    assert('GET /payments', paymentsGet.status === 200 && Array.isArray(paymentsGet.body), `Count: ${paymentsGet.body?.length}`);

    const revenueGet = await request('/payments/revenue', { role: 'admin' });
    assert('GET /payments/revenue', revenueGet.status === 200 && typeof revenueGet.body.totalRevenue === 'number', `Total: ₹${revenueGet.body?.totalRevenue}`);

    const testPayment = await request('/payments', {
      method: 'POST',
      role: 'tenant',
      body: {
        tenantId: 1,
        propertyId: 1,
        roomId: 1,
        room: '101',
        amount: 8000,
        method: 'upi',
        transactionId: `TXN-${Date.now()}`,
      },
    });
    assert('POST /payments', testPayment.status === 201 && testPayment.body.id, `Created ID: ${testPayment.body?.id}`);

    if (testPayment.body?.id) {
      const payUpdate = await request(`/payments/${testPayment.body.id}`, {
        method: 'PUT',
        role: 'admin',
        body: { status: 'verified', clearance: 'Approved' },
      });
      assert('PUT /payments/:id', payUpdate.status === 200 && payUpdate.body.status === 'verified');

      const payDel = await request(`/payments/${testPayment.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /payments/:id', payDel.status === 200);
    }

    // 8. COMPLAINTS
    console.log('\n--- 8. Testing Complaints API ---');
    const complaintsGet = await request('/complaints', { role: 'tenant' });
    assert('GET /complaints', complaintsGet.status === 200 && Array.isArray(complaintsGet.body), `Count: ${complaintsGet.body?.length}`);

    const testComplaint = await request('/complaints', {
      method: 'POST',
      role: 'tenant',
      body: {
        tenantId: 1,
        propertyId: 1,
        roomId: 1,
        title: 'Geyser issue',
        category: 'Plumbing',
        priority: 'high',
        description: 'Hot water not working',
      },
    });
    assert('POST /complaints', testComplaint.status === 201 && testComplaint.body.id, `Created ID: ${testComplaint.body?.id}`);

    if (testComplaint.body?.id) {
      const compUpdate = await request(`/complaints/${testComplaint.body.id}`, {
        method: 'PUT',
        role: 'warden',
        body: { status: 'resolved' },
      });
      assert('PUT /complaints/:id', compUpdate.status === 200 && compUpdate.body.status === 'resolved');

      const compDel = await request(`/complaints/${testComplaint.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /complaints/:id', compDel.status === 200);
    }

    // 9. NOTIFICATIONS
    console.log('\n--- 9. Testing Notifications API ---');
    const notifsGet = await request('/notifications', { role: 'tenant' });
    assert('GET /notifications', notifsGet.status === 200 && Array.isArray(notifsGet.body), `Count: ${notifsGet.body?.length}`);

    const testNotif = await request('/notifications', {
      method: 'POST',
      role: 'warden',
      body: {
        title: 'Maintenance Notice',
        message: 'Water supply will be paused for 1 hour tomorrow.',
        type: 'info',
        priority: 'medium',
        recipients: 1,
        byUserId: 6,
        userId: 1,
      },
    });
    assert('POST /notifications', testNotif.status === 201 && testNotif.body.id, `Created ID: ${testNotif.body?.id}`);

    if (testNotif.body?.id) {
      const notifRead = await request(`/notifications/${testNotif.body.id}/read`, {
        method: 'PUT',
        role: 'tenant',
      });
      assert('PUT /notifications/:id/read', notifRead.status === 200 && (notifRead.body.isRead === true || notifRead.body.read === true));

      const notifReadAll = await request('/notifications/read-all', {
        method: 'PUT',
        role: 'tenant',
      });
      assert('PUT /notifications/read-all', notifReadAll.status === 200);

      const notifDel = await request(`/notifications/${testNotif.body.id}`, { method: 'DELETE', role: 'admin' });
      assert('DELETE /notifications/:id', notifDel.status === 200);
    }

    console.log('\n==============================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`TOTAL TESTS: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
    console.log('==============================================');
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
