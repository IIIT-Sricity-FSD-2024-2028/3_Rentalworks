const MOCK_DATA = {
  warden: {
    name: "Warden",
    email: "owner@pgrentals.com",
    phone: "+91 98765 00000",
    property: "Sunrise PG",
    joined: "1/15/2024",
    status: "Active",
    role: "warden",
    username: "warden",
    password: "warden123"
  },

  stats: {
    totalTenants: 5,
    occupiedRooms: 5,
    vacantRooms: 45,
    activeComplaints: 4,
    ruleViolations: 4
  },

  tenants: [
    { id: 1, name: "Rahul Kumar", room: "204", phone: "+91 98765 43210", checkIn: "1/15/2024", rent: 8000, paymentStatus: "paid" },
    { id: 2, name: "Priya Shah", room: "105", phone: "+91 98765 43211", checkIn: "2/1/2024", rent: 7500, paymentStatus: "paid" },
    { id: 3, name: "Amit Verma", room: "301", phone: "+91 98765 43212", checkIn: "1/20/2024", rent: 9000, paymentStatus: "pending" },
    { id: 4, name: "Sneha Patil", room: "208", phone: "+91 98765 43213", checkIn: "3/5/2026", rent: 8000, paymentStatus: "paid" },
    { id: 5, name: "Vikram Singh", room: "102", phone: "+91 98765 43214", checkIn: "12/10/2023", rent: 7500, paymentStatus: "paid" },
    { id: 6, name: "Anita Desai", room: "305", phone: "+91 98765 43215", checkIn: "2/15/2024", rent: 9000, paymentStatus: "pending" }
  ],

  rooms: [
    { id: 1, number: "101", type: "Single", occupancy: "Vacant", maintenance: "Ready", lastUpdated: "3/5/2026" },
    { id: 2, number: "102", type: "Double", occupancy: "Occupied", maintenance: "Ready", lastUpdated: "3/4/2026" },
    { id: 3, number: "103", type: "Triple", occupancy: "Vacant", maintenance: "Under Maintenance", lastUpdated: "3/6/2026" },
    { id: 4, number: "104", type: "Double", occupancy: "Vacant", maintenance: "Cleaned", lastUpdated: "3/6/2026" },
    { id: 5, number: "105", type: "Single", occupancy: "Occupied", maintenance: "Ready", lastUpdated: "3/3/2026" },
    { id: 6, number: "201", type: "Triple", occupancy: "Vacant", maintenance: "Under Maintenance", lastUpdated: "3/5/2026" },
    { id: 7, number: "202", type: "Double", occupancy: "Occupied", maintenance: "Ready", lastUpdated: "3/4/2026" },
    { id: 8, number: "203", type: "Single", occupancy: "Vacant", maintenance: "Cleaned", lastUpdated: "3/6/2026" }
  ],

  violations: [
    { id: 1, tenant: "Amit Verma", room: "301", type: "Late Night Entry", severity: "medium", warnings: 2, date: "3/5/2026" },
    { id: 2, tenant: "Rahul Kumar", room: "204", type: "Noise Complaint", severity: "low", warnings: 1, date: "3/4/2026" },
    { id: 3, tenant: "Karan Patel", room: "405", type: "Unauthorized Guest", severity: "high", warnings: 3, date: "3/6/2026" },
    { id: 4, tenant: "Neha Sharma", room: "102", type: "Smoking Indoors", severity: "high", warnings: 2, date: "3/3/2026" },
    { id: 5, tenant: "Rohan Mehta", room: "208", type: "Common Area Misuse", severity: "low", warnings: 1, date: "3/2/2026" }
  ],

  complaints: [
    { id: "CMP-001", tenant: "Rahul Kumar", room: "204", type: "Maintenance", priority: "high", status: "open", date: "3/6/2026", description: "The air conditioner in my room has stopped working. It was fine until yesterday evening but now it doesn't turn on at all. The room is getting very hot and uncomfortable.", timeline: [{ time: "2026-03-06 10:30 AM", event: "Complaint submitted by tenant", by: "Rahul Kumar" }, { time: "2026-03-06 11:00 AM", event: "Complaint reviewed by warden", by: "Warden" }] },
    { id: "CMP-002", tenant: "Priya Shah", room: "105", type: "Plumbing", priority: "high", status: "in_progress", date: "3/5/2026", description: "Water leakage from bathroom pipes.", timeline: [{ time: "2026-03-05 09:00 AM", event: "Complaint submitted by tenant", by: "Priya Shah" }] },
    { id: "CMP-003", tenant: "Amit Verma", room: "301", type: "Electrical", priority: "medium", status: "open", date: "3/5/2026", description: "Power socket not working in the room.", timeline: [{ time: "2026-03-05 02:00 PM", event: "Complaint submitted by tenant", by: "Amit Verma" }] },
    { id: "CMP-004", tenant: "Sneha Patil", room: "208", type: "Cleanliness", priority: "low", status: "in_progress", date: "3/4/2026", description: "Common area not cleaned properly.", timeline: [{ time: "2026-03-04 08:00 AM", event: "Complaint submitted by tenant", by: "Sneha Patil" }] },
    { id: "CMP-005", tenant: "Vikram Singh", room: "102", type: "Maintenance", priority: "high", status: "resolved", date: "3/3/2026", description: "Door lock was broken.", timeline: [{ time: "2026-03-03 10:00 AM", event: "Complaint submitted by tenant", by: "Vikram Singh" }, { time: "2026-03-03 04:00 PM", event: "Complaint resolved", by: "Warden" }] }
  ],

  notifications: [
    { id: 1, title: "New Complaint Received", message: "Rahul Kumar (Room 204) reported AC malfunction", time: "1 hour ago", read: false, icon: "warning" },
    { id: 2, title: "Rule Violation Reported", message: "Karan Patel (Room 405) - Unauthorized guest entry", time: "3 hours ago", read: false, icon: "warning" },
    { id: 3, title: "Room Service Completed", message: "Room 103 maintenance has been completed", time: "5 hours ago", read: true, icon: "check" },
    { id: 4, title: "New Tenant Check-in", message: "Sneha Patil checked in to Room 208", time: "1 day ago", read: true, icon: "info" },
    { id: 5, title: "Payment Received", message: "Vikram Singh (Room 102) payment received", time: "2 days ago", read: true, icon: "check" },
    { id: 6, title: "Room Change Request", message: "Anita Desai requested room change from 305 to 308", time: "3 days ago", read: true, icon: "info" }
  ]
};