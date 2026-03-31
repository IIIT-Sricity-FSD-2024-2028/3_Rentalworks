const State = {
  data: {
    currentUser: null,
    currentPage: 'login',
    selectedIssueCategory: null,
    selectedPriority: 'medium',
    selectedService: null,
    currentPayment: null, 
    lastPayment: null,
    
    profile: { 
      name: 'Rahul Sharma', 
      phone: '+91 98765 43210', 
      address: 'A-204, Sunrise PG Residency, Andheri West, Mumbai',
      twoFactorEnabled: false
    },
    
    pendingPayments: [
      { id: 101, type: 'Monthly Rent', title: 'March 2026 rent payment', due: 'Mar 10, 2026', amount: 12000 },
      { id: 102, type: 'Electricity Bill', title: 'February electricity charges', due: 'Mar 15, 2026', amount: 850 }
    ],
    paymentHistory: [
      { id: 901, type: 'Monthly Rent', amount: 12000, date: 'Feb 5, 2026', method: 'UPI', txn: 'TXN123456789' }
    ],

    // LOTS OF MOCK DATA ADDED HERE:
    complaints: [
      { id: 1, title: 'AC not working', desc: 'No cooling in room A-204. Need it fixed urgently before summer hits.', priority: 'high', status: 'open', created: 'Mar 26, 2026' },
      { id: 2, title: 'Noisy Neighbors', desc: 'Room 305 is playing loud music past midnight every day.', priority: 'medium', status: 'in-progress', created: 'Mar 24, 2026' },
      { id: 3, title: 'Room not cleaned', desc: 'The housekeeping staff skipped my room yesterday and today.', priority: 'low', status: 'open', created: 'Mar 28, 2026' },
      { id: 4, title: 'Main Gate locked early', desc: 'Guard locked the gate at 10 PM instead of 11 PM.', priority: 'medium', status: 'resolved', created: 'Mar 15, 2026' }
    ],
    issues: [
      { id: 1, title: 'Broken Window Lock', desc: 'Window in room 204 won\'t lock properly, feels unsafe.', category: 'Maintenance', priority: 'high', status: 'open' },
      { id: 2, title: 'Microwave sparking', desc: 'Common microwave on 2nd floor is sparking when turned on.', category: 'Appliances', priority: 'high', status: 'in-progress' },
      { id: 3, title: 'Tube light flickering', desc: 'Corridor light near room 204 keeps flickering.', category: 'Electrical', priority: 'low', status: 'resolved' },
      { id: 4, title: 'Slow Wi-Fi', desc: 'Getting less than 2Mbps on the 2nd-floor router.', category: 'Internet/WiFi', priority: 'medium', status: 'open' }
    ],
    serviceRequests: [],
    notifications: [
      { id: 1, type: 'alert', icon: '⏰', bg: '#fef9c3', title: 'Payment Reminder', desc: 'March Rent due on Mar 10.', time: '2 hours ago', unread: true },
      { id: 2, type: 'info', icon: '📦', bg: '#eff6ff', title: 'Package Delivered', desc: 'A package arrived for you at the reception.', time: '5 hours ago', unread: true },
      { id: 3, type: 'success', icon: '✅', bg: '#f0fdf4', title: 'Issue Resolved', desc: 'Maintenance fixed the flickering tube light.', time: '1 day ago', unread: true },
      { id: 4, type: 'info', icon: 'ℹ️', bg: '#eff6ff', title: 'Water Supply Notice', desc: 'Water will be shut off for 2 hours tomorrow at 2 PM.', time: '2 days ago', unread: false },
      { id: 5, type: 'success', icon: '👕', bg: '#f0fdf4', title: 'Laundry Ready', desc: 'Your laundry has been washed, ironed, and is ready for pickup.', time: '3 days ago', unread: false },
      { id: 6, type: 'success', icon: '✅', bg: '#f0fdf4', title: 'Payment Received', desc: 'Your February rent payment was successful.', time: '1 week ago', unread: false }
    ]
  },

  init() {
    const saved = localStorage.getItem('pgRentalState');
    if (saved) this.data = { ...this.data, ...JSON.parse(saved) };
  },
  save() {
    localStorage.setItem('pgRentalState', JSON.stringify(this.data));
  },
  update(key, value) {
    this.data[key] = value;
    this.save();
  }
};