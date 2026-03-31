// ===================================================
//  mockData_login.js  (UPDATED)
//  Central mock data for all login roles and
//  registration records
// ===================================================

const LOGIN_MOCK = {

  // ===== CREDENTIALS =====
  credentials: {
    admin: [
      { username: 'admin', password: 'admin123', name: 'Admin', email: 'admin@pgrentals.com', role: 'admin' }
    ],
    warden: [
      { username: 'warden', password: 'warden123', name: 'Warden', email: 'warden@pgrentals.com', role: 'warden', property: 'Sunrise PG' }
    ],
    owner: [
      { username: 'owner1', password: 'owner123', name: 'Rajesh Kumar', email: 'rajesh@email.com', role: 'owner', property: 'Green Valley PG' }
    ],
    tenant: [
      { username: 'tenant', password: 'password123', name: 'Tenant', email: 'tenant@pgrentals.com', role: 'tenant', room: '101', property: 'Main PG' }
    ],
    guest: [
      { email: 'guest@email.com', password: 'guest123', name: 'Guest User', role: 'guest', status: 'active' }
    ]
  },

  // ===== REGISTERED GUESTS (from sign-up) =====
  // Guests are immediately active — no admin approval needed
  registeredGuests: [
    {
      id: 1,
      name: 'Sneha Kapoor',
      email: 'sneha@email.com',
      phone: '+91 98765 11111',
      dob: '2000-05-14',
      address: '12 MG Road, Bangalore',
      city: 'Bangalore',
      password: 'sneha123',
      role: 'guest',
      status: 'active',          // ← active, not pending
      registeredOn: '2026-03-20'
    }
  ],

  // ===== REGISTERED OWNERS / PROPERTIES (pending admin approval) =====
  // Owners always need admin approval before their property goes live
  registeredOwners: [
    {
      id: 1,
      name: 'Sunita Rao',
      email: 'sunita@email.com',
      phone: '+91 98765 22222',
      propertyName: 'Urban Nest',
      propertyAddress: '45 Indiranagar, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      totalRooms: 30,
      totalCapacity: 60,
      amenities: ['WiFi', 'AC', 'Parking', 'Gym'],
      idProof: 'Aadhaar - uploaded',
      propertyImages: '3 images - uploaded',
      commissionAgreed: true,
      role: 'owner',
      status: 'pending',         // ← always pending until admin approves
      registeredOn: '2026-03-22',
      docsVerified: false,
      inspectionPassed: false
    }
  ]
};