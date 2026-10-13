async function testIntegration() {
  const baseUrl = 'http://localhost:3000';
  const headers = {
    'Content-Type': 'application/json',
    'x-role': 'owner',
    'x-user-id': '16',
  };

  console.log('--- 1. Testing GET /api/dashboard/stats ---');
  let res = await fetch(baseUrl + '/api/dashboard/stats', { headers: headers });
  if (!res.ok) throw new Error('GET stats failed: ' + res.status);
  let stats = await res.json();
  console.log('Initial Total Properties:', stats.totalProperties);
  console.log('Initial Total Rooms:', stats.totalRooms);
  console.log('Initial Occupancy Rate:', stats.occupancyRate + '%');

  console.log('\n--- 2. Testing POST /api/properties (Create Property) ---');
  const newPropPayload = {
    name: 'Lotus Residency PG',
    location: 'Chennai, Tamil Nadu',
    ownerId: 16,
    rentMin: 8000,
    rentMax: 11000,
    rooms: '5/15',
    amenities: ['WiFi', 'AC', 'Mess'],
    address: '15 Gandhi Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600028',
    type: 'Mixed',
    totalCapacity: 30,
    totalRooms: 15,
    occupiedRooms: 5,
    monthlyRent: 8000,
  };
  res = await fetch(baseUrl + '/api/properties', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(newPropPayload),
  });
  if (!res.ok) throw new Error('POST property failed: ' + res.status + ' ' + (await res.text()));
  const createdProp = await res.json();
  console.log('Successfully created Property ID:', createdProp.id, createdProp.name);

  console.log('\n--- 3. Testing GET /api/properties/:id ---');
  res = await fetch(baseUrl + '/api/properties/' + createdProp.id, { headers: headers });
  if (!res.ok) throw new Error('GET property failed: ' + res.status);
  const fetchedProp = await res.json();
  console.log('Fetched Property from DB:', fetchedProp.id, fetchedProp.name, fetchedProp.city, fetchedProp.monthlyRent);

  console.log('\n--- 4. Testing PUT /api/properties/:id (Update Property) ---');
  const updatePropPayload = {
    monthlyRent: 8800,
    occupiedRooms: 8,
  };
  res = await fetch(baseUrl + '/api/properties/' + createdProp.id, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(updatePropPayload),
  });
  if (!res.ok) throw new Error('PUT property failed: ' + res.status);
  const updatedProp = await res.json();
  console.log('Updated Property in DB. New Rent:', updatedProp.monthlyRent, 'Occupied:', updatedProp.occupiedRooms);

  console.log('\n--- 5. Testing PUT /api/issues/:id (Update Issue Status) ---');
  res = await fetch(baseUrl + '/api/issues/3', {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify({ status: 'in-progress' }),
  });
  if (!res.ok) throw new Error('PUT issue failed: ' + res.status);
  const updatedIssue = await res.json();
  console.log('Updated Issue 3 in DB. Status:', updatedIssue.status);

  console.log('\n--- 6. Testing PUT /api/policies (Update Policy) ---');
  const policyUpdate = {
    rentDueDay: 7,
    lateFee: 600,
    guestPolicy: 'allowed',
  };
  res = await fetch(baseUrl + '/api/policies', {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(policyUpdate),
  });
  if (!res.ok) throw new Error('PUT policy failed: ' + res.status);
  const updatedPolicy = await res.json();
  console.log('Updated Policy in DB. rentDueDay:', updatedPolicy.rentDueDay, 'lateFee:', updatedPolicy.lateFee);

  console.log('\n--- 7. Testing PUT /api/profile (Update Profile) ---');
  const profileUpdate = {
    company: 'Iyer PG & Rental Holdings',
    city: 'Chennai',
  };
  res = await fetch(baseUrl + '/api/profile', {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(profileUpdate),
  });
  if (!res.ok) throw new Error('PUT profile failed: ' + res.status);
  const updatedProfile = await res.json();
  console.log('Updated Profile in DB. Company:', updatedProfile.company);

  console.log('\n--- 8. Testing PUT /api/subscription (Update Subscription) ---');
  const subUpdate = {
    plan: 'Premium',
    fee: 8000,
  };
  res = await fetch(baseUrl + '/api/subscription', {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(subUpdate),
  });
  if (!res.ok) throw new Error('PUT subscription failed: ' + res.status);
  const updatedSub = await res.json();
  console.log('Updated Subscription in DB. Current Plan:', updatedSub.currentPlan, 'Fee:', updatedSub.monthlyFee);

  console.log('\n--- 9. Testing GET /api/dashboard/stats after updates ---');
  res = await fetch(baseUrl + '/api/dashboard/stats', { headers: headers });
  stats = await res.json();
  console.log('Reflected Total Properties in DB:', stats.totalProperties);
  console.log('Reflected Total Rooms in DB:', stats.totalRooms);
  console.log('Reflected Monthly Revenue in DB: ₹' + stats.monthlyRevenue);

  console.log('\n--- 10. Testing DELETE /api/properties/:id (Clean up test property) ---');
  res = await fetch(baseUrl + '/api/properties/' + createdProp.id, {
    method: 'DELETE',
    headers: headers,
  });
  if (!res.ok) throw new Error('DELETE property failed: ' + res.status);
  console.log('Cleaned up test property ID:', createdProp.id);

  console.log('\n=============================================');
  console.log('ALL OWNER API INTEGRATION TESTS PASSED 100%!');
  console.log('=============================================');
}

testIntegration().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
