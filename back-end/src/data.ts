export const USERS = [
  { id: 1, name: 'Amit Sharma', email: 'amit.s@email.com', phone: '+91 98765 43210', role: 'tenant', property: 'Green Valley PG', status: 'active', joinDate: '2024-01-15', username: 'amit', password: 'password123' },
  { id: 2, name: 'Rohan Singh', email: 'rohan.s@email.com', phone: '+91 98765 43212', role: 'tenant', property: 'Urban Nest', status: 'active', joinDate: '2024-03-10', username: 'rohan', password: 'password123' },
  { id: 3, name: 'Anita Verma', email: 'anita.v@email.com', phone: '+91 98765 43215', role: 'tenant', property: 'Sunrise Heights', status: 'active', joinDate: '2024-02-14', username: 'anita', password: 'password123' },
  { id: 4, name: 'Vikram Desai', email: 'vikram.d@email.com', phone: '+91 98765 43216', role: 'tenant', property: 'Comfort Stay', status: 'active', joinDate: '2024-03-01', username: 'vikram', password: 'password123' },
  { id: 5, name: 'Neha Kapoor', email: 'neha.k@email.com', phone: '+91 98765 43217', role: 'tenant', property: 'Sunrise Heights', status: 'active', joinDate: '2024-02-28', username: 'neha', password: 'password123' },
  { id: 6, name: 'Rajesh Kumar', email: 'rajesh.k@email.com', phone: '+91 98765 43214', role: 'owner', property: 'Green Valley PG', status: 'active', joinDate: '2023-12-01', username: 'owner1', password: 'owner123' },
  { id: 7, name: 'Priya Patel', email: 'priya.p@email.com', phone: '+91 98765 43211', role: 'owner', property: 'Sunrise Heights', status: 'active', joinDate: '2024-02-20', username: 'owner2', password: 'owner123' },
  { id: 8, name: 'Sunita Rao', email: 'sunita.r@email.com', phone: '+91 98765 43218', role: 'owner', property: 'Urban Nest', status: 'active', joinDate: '2023-11-15', username: 'owner3', password: 'owner123' },
  { id: 9, name: 'Amit Verma', email: 'amit.v@email.com', phone: '+91 98765 43219', role: 'owner', property: 'Comfort Stay', status: 'active', joinDate: '2024-01-10', username: 'owner4', password: 'owner123' },
  { id: 10, name: 'Sneha Gupta', email: 'sneha.g@email.com', phone: '+91 98765 43213', role: 'warden', property: 'Sunrise Heights', status: 'active', joinDate: '2024-01-05', username: 'warden', password: 'warden123' },
  { id: 11, name: 'Admin', email: 'admin@pgrentals.com', phone: '+91 00000 00000', role: 'admin', property: null, status: 'active', joinDate: '2024-01-01', username: 'admin', password: 'admin123'}
];

export const PROPERTIES = [
  { id: 1, name: 'Green Valley PG', location: 'Koramangala, Bangalore', owner: 'Rajesh Kumar', rentMin: 7000, rentMax: 9000, safetyScore: 9.2, rooms: '1/2', occupancy: 50, amenities: ['WiFi', 'AC', 'Parking', 'Gym'], status: 'approved', docsVerified: true, inspectionPassed: true, commissionRate: 10, compliance: 'Verified', fireSafety: 'Yes', changeRequestPending: false },
  { id: 2, name: 'Sunrise Heights', location: 'HSR Layout, Bangalore', owner: 'Priya Patel', rentMin: 6500, rentMax: 8500, safetyScore: 8.8, rooms: '2/3', occupancy: 66, amenities: ['WiFi', 'AC', 'Laundry'], status: 'approved', docsVerified: true, inspectionPassed: true, commissionRate: 10, compliance: 'Verified', fireSafety: 'Yes', changeRequestPending: true },
  { id: 3, name: 'Urban Nest', location: 'Indiranagar, Bangalore', owner: 'Sunita Rao', rentMin: 8000, rentMax: 10000, safetyScore: 9.5, rooms: '1/4', occupancy: 25, amenities: ['WiFi', 'AC', 'Parking', 'Gym'], status: 'pending', docsVerified: true, inspectionPassed: false, commissionRate: 10, compliance: 'Pending', fireSafety: 'Pending', changeRequestPending: false },
  { id: 4, name: 'Comfort Stay', location: 'Whitefield, Bangalore', owner: 'Amit Verma', rentMin: 5500, rentMax: 7500, safetyScore: 7.9, rooms: '1/2', occupancy: 50, amenities: ['WiFi', 'Parking'], status: 'pending', docsVerified: false, inspectionPassed: false, commissionRate: 10, compliance: 'Pending', fireSafety: 'Pending', changeRequestPending: false }
];

export const BOOKINGS = [
  { id: 1, tenant: 'Amit Sharma', phone: '+91 98765 43210', property: 'Green Valley PG', room: '101', checkIn: '2026-03-15', duration: '12 months', rent: 9000, status: 'active' },
  { id: 2, tenant: 'Neha Kapoor', phone: '+91 98765 43217', property: 'Sunrise Heights', room: '201', checkIn: '2026-03-20', duration: '6 months', rent: 8000, status: 'pending' },
  { id: 3, tenant: 'Rohan Singh', phone: '+91 98765 43212', property: 'Urban Nest', room: '102', checkIn: '2026-03-18', duration: '12 months', rent: 7500, status: 'pending' },
  { id: 4, tenant: 'Anita Verma', phone: '+91 98765 43215', property: 'Sunrise Heights', room: '202', checkIn: '2026-02-10', duration: '6 months', rent: 7000, status: 'cancelled' },
  { id: 5, tenant: 'Vikram Desai', phone: '+91 98765 43216', property: 'Comfort Stay', room: '101', checkIn: '2026-01-15', duration: '3 months', rent: 6500, status: 'overdue' }
];

export const PAYMENTS = [
  { id: 1, tenant: 'Amit Sharma', property: 'Green Valley PG', room: '101', amount: 9000, method: 'UPI', transactionId: 'UPI1202603810001', paidDate: '2026-02-28', status: 'verified', clearance: 'Approved' },
  { id: 2, tenant: 'Neha Kapoor', property: 'Sunrise Heights', room: '201', amount: 8000, method: 'Bank Transfer', transactionId: 'NEFT1202603850023', paidDate: '2026-03-05', status: 'pending', clearance: 'Pending' },
  { id: 3, tenant: 'Rohan Singh', property: 'Urban Nest', room: '102', amount: 7500, method: 'UPI', transactionId: 'UPI1202603860045', paidDate: '2026-03-06', status: 'pending', clearance: 'Pending' },
  { id: 4, tenant: 'Anita Verma', property: 'Sunrise Heights', room: '202', amount: 7000, method: 'Card', transactionId: 'CRD1202602148009', paidDate: '2026-02-14', status: 'refunded', clearance: 'Approved' }
];

export const COMPLAINTS = [
  { id: 1, tenant: 'Rohan Singh', property: 'Urban Nest', description: 'AC not working', status: 'open', reportedAt: '2026-03-10' },
  { id: 2, tenant: 'Amit Sharma', property: 'Green Valley PG', description: 'Water leak in bathroom', status: 'resolved', reportedAt: '2026-02-22' }
];

export const NOTIFICATIONS = [
  { id: 1, title: 'System Maintenance Notice', message: 'The system will be down for maintenance on March 10, 2026.', type: 'announcement', priority: 'urgent', recipients: 10, sentAt: '2026-03-07 14:30', by: 'Admin' },
  { id: 2, title: 'New Property Guidelines', message: 'Updated guidelines for property listings have been published.', type: 'update', priority: 'important', recipients: 4, sentAt: '2026-03-05 10:15', by: 'Admin' }
];

let nextId = { user: 12, property: 5, booking: 6, payment: 5, complaint: 3, notification: 3 };
export const getNextId = (entity: string) => nextId[entity]++;
