const State = {
    ROOM_CONFIG: {
        'Single Room': { roomId: '101', name: 'Single Room', rent: 16000, deposit: 8000, capacity: 1 },
        'Double Sharing': { roomId: '102', name: 'Double Sharing', rent: 10000, deposit: 5000, capacity: 2 },
        'Triple Sharing': { roomId: '103', name: 'Triple Sharing', rent: 8500, deposit: 4250, capacity: 3 }
    },
    getRoomConfig(roomType) {
        if (!roomType) return this.ROOM_CONFIG['Double Sharing'];
        for (const key in this.ROOM_CONFIG) {
            if (roomType.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(roomType.toLowerCase())) {
                return this.ROOM_CONFIG[key];
            }
        }
        return { roomId: '102', name: roomType, rent: 10000, deposit: 5000, capacity: 2 };
    },
    data: {
        currentUser: null,
        currentPage: 'landing',
        currentRmIndex: 0,
        selectedRm: null,
        activeBooking: null,
        bookingFor: 'self',
        friendDetails: null,
        
        // 12 Diverse Roommates for the Mens PG
        roommates: [
            { id: 1, name: 'Rahul Sharma', age: 24, job: 'Software Engineer', match: 95, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', bio: 'Early riser, highly organized, loves clean spaces. Into coding and weekend hikes.', tags: ['Clean Freak', 'Techie'] },
            { id: 2, name: 'Vikram Singh', age: 26, job: 'Fitness Trainer', match: 88, img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500', bio: 'Gym is life. Very chill roommate, out of the house most of the day.', tags: ['Fitness', 'Foodie'] },
            { id: 3, name: 'Karan Mehta', age: 23, job: 'UX Designer', match: 82, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500', bio: 'Night owl. I play acoustic guitar and love indie music.', tags: ['Night Owl', 'Creative'] },
            { id: 4, name: 'Aditya Kulkarni', age: 25, job: 'Data Analyst', match: 75, img: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=500', bio: 'Strictly vegetarian. Big fan of Formula 1. Looking for someone quiet.', tags: ['Vegetarian', 'Quiet'] },
            { id: 5, name: 'Siddharth Bose', age: 27, job: 'Marketing Lead', match: 91, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500', bio: 'Social butterfly. I love organizing weekend cafe hops and watching football.', tags: ['Social', 'Extrovert'] },
            { id: 6, name: 'Rohan Gupta', age: 22, job: 'Student', match: 85, img: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=500', bio: 'Studying master in CS. Usually buried in books or gaming.', tags: ['Gamer', 'Student'] },
            { id: 7, name: 'Aman Verma', age: 29, job: 'Banker', match: 72, img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500', bio: 'Workaholic. Very private and mind my own business.', tags: ['Professional', 'Quiet'] },
            { id: 8, name: 'Farhan Ali', age: 24, job: 'Photographer', match: 89, img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500', bio: 'Always out shooting. Super respectful of boundaries and communal spaces.', tags: ['Creative', 'Traveler'] },
            { id: 9, name: 'Arjun Das', age: 28, job: 'Chef', match: 98, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', bio: 'I cook amazing meals and share! Expect great aromas from the kitchen.', tags: ['Foodie', 'Friendly'] },
            { id: 10, name: 'Neha ... wait no, Neeraj Kumar', age: 24, job: 'Consultant', match: 77, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500', bio: 'Traveling 4 days a week. Barely around. Need someone reliable.', tags: ['Traveler', 'Chill'] },
            { id: 11, name: 'Varun Dhawan', age: 26, job: 'Freelancer', match: 83, img: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=500', bio: 'Work from home regular. Needs decent Wi-Fi and quiet mornings.', tags: ['WFH', 'Introvert'] },
            { id: 12, name: 'Manish Pandey', age: 25, job: 'Start-up Founder', match: 94, img: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=500', bio: 'Hustling 24/7. Love bouncing off ideas and having good intellectual talks.', tags: ['Entrepreneur', 'Social'] }
        ],
        bookings: [],
        transactions: []
    },
    init() {
        let userKey = 'guest';
        const pgUserStr = sessionStorage.getItem('pg_user');
        if (pgUserStr) {
            try {
                const pgUser = JSON.parse(pgUserStr);
                userKey = pgUser.email || pgUser.username || pgUser.name || 'guest';
            } catch (e) {}
        }
        this.storageKey = 'sunrise_pg_state_' + userKey;

        // Read directly from the newly established centralized state namespace
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data.currentUser = parsed.currentUser || null;
                this.data.currentPage = parsed.currentPage || 'landing';
                this.data.bookings = parsed.bookings || [];
                this.data.transactions = parsed.transactions || [];
                this.data.selectedRm = parsed.selectedRm || null;
                this.data.activeBooking = parsed.activeBooking || null;
                this.data.bookingFor = parsed.bookingFor || 'self';
                this.data.friendDetails = parsed.friendDetails || null;
            } catch(e){}
        }
        this.RoomOccupancy.init();
    },
    save() { localStorage.setItem(this.storageKey || 'sunrise_pg_state_guest', JSON.stringify(this.data)); },
    getOccupiedCount(pgName, roomType) {
        const state = this.RoomOccupancy.getRoomState(roomType);
        return state.occupied;
    },
    getRoomCapacity(pgName, roomType) {
        return this.getRoomConfig(roomType).capacity;
    },
    RoomOccupancy: {
        STORAGE_KEY: 'sunrise_room_occupancy',
        init() {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                const defaultState = {
                    '101': { roomId: '101', roomType: 'Single Room', capacity: 1, occupied: 0, reserved: 0, activeReservations: [], waitingList: [] },
                    '102': { roomId: '102', roomType: 'Double Sharing', capacity: 2, occupied: 0, reserved: 0, activeReservations: [], waitingList: [] },
                    '103': { roomId: '103', roomType: 'Triple Sharing', capacity: 3, occupied: 0, reserved: 0, activeReservations: [], waitingList: [] }
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultState));
            }
            this.cleanExpired();
        },
        _load() {
            try {
                const str = localStorage.getItem(this.STORAGE_KEY);
                return str ? JSON.parse(str) : {};
            } catch (e) {
                return {};
            }
        },
        _save(data) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        },
        cleanExpired() {
            const data = this._load();
            const now = Date.now();
            let modified = false;
            for (const rId in data) {
                const room = data[rId];
                if (!room.activeReservations) room.activeReservations = [];
                if (!room.waitingList) room.waitingList = [];
                const validRes = [];
                room.activeReservations.forEach(res => {
                    if (now < res.expiresAt) {
                        validRes.push(res);
                    } else {
                        modified = true;
                        // Auto offer seat to #1 on waiting list if anyone is waiting
                        if (room.waitingList.length > 0) {
                            const nextUser = room.waitingList.shift();
                            const newRes = {
                                bookingId: 'RES-' + Date.now(),
                                userId: nextUser.userId,
                                userName: nextUser.userName,
                                timestamp: Date.now(),
                                expiresAt: Date.now() + 15 * 60 * 1000
                            };
                            validRes.push(newRes);
                            this._notifyUser(nextUser.userId, "Good news! A room has become available. Please complete payment within 15 minutes.");
                        }
                    }
                });
                room.activeReservations = validRes;
                room.reserved = room.activeReservations.length;
                room.available = Math.max(0, room.capacity - room.occupied - room.reserved);
            }
            if (modified) {
                this._save(data);
            }
        },
        _notifyUser(userId, message) {
            try {
                let notifs = JSON.parse(localStorage.getItem('cross_notifications') || '[]');
                notifs.push({
                    id: Date.now() + Math.random(),
                    userId: userId,
                    message: message,
                    time: new Date().toLocaleTimeString(),
                    read: false
                });
                localStorage.setItem('cross_notifications', JSON.stringify(notifs));
            } catch (e) {}
        },
        getRoomState(roomType) {
            this.cleanExpired();
            const cfg = State.getRoomConfig(roomType);
            const data = this._load();
            let room = data[cfg.roomId];
            if (!room) {
                room = { roomId: cfg.roomId, roomType: cfg.name, capacity: cfg.capacity, occupied: 0, reserved: 0, activeReservations: [], waitingList: [] };
                data[cfg.roomId] = room;
                this._save(data);
            }
            room.reserved = (room.activeReservations || []).length;
            room.available = Math.max(0, room.capacity - (room.occupied || 0) - room.reserved);
            return room;
        },
        reserveSeat(roomType, user, bookingId) {
            this.cleanExpired();
            const cfg = State.getRoomConfig(roomType);
            const data = this._load();
            let room = data[cfg.roomId] || { roomId: cfg.roomId, roomType: cfg.name, capacity: cfg.capacity, occupied: 0, reserved: 0, activeReservations: [], waitingList: [] };
            room.reserved = (room.activeReservations || []).length;
            room.available = Math.max(0, room.capacity - (room.occupied || 0) - room.reserved);
            
            // Check if user already holds reservation for this booking
            const existing = (room.activeReservations || []).find(r => r.bookingId === bookingId || r.userId === user);
            if (existing && Date.now() < existing.expiresAt) {
                return { success: true, expiresAt: existing.expiresAt, roomId: cfg.roomId };
            }
            
            if (room.available > 0) {
                const expiresAt = Date.now() + 15 * 60 * 1000;
                room.activeReservations.push({
                    bookingId: bookingId,
                    userId: user,
                    userName: user,
                    timestamp: Date.now(),
                    expiresAt: expiresAt
                });
                room.reserved = room.activeReservations.length;
                room.available = Math.max(0, room.capacity - room.occupied - room.reserved);
                data[cfg.roomId] = room;
                this._save(data);
                return { success: true, expiresAt: expiresAt, roomId: cfg.roomId };
            } else {
                let earliestExpiry = Date.now() + 15 * 60 * 1000;
                if (room.activeReservations && room.activeReservations.length > 0) {
                    earliestExpiry = Math.min(...room.activeReservations.map(r => r.expiresAt));
                }
                return { success: false, reason: 'reserved', expiresAt: earliestExpiry, waitingCount: (room.waitingList || []).length, roomId: cfg.roomId };
            }
        },
        confirmSeat(roomType, bookingId) {
            const cfg = State.getRoomConfig(roomType);
            const data = this._load();
            let room = data[cfg.roomId];
            if (!room) return;
            room.activeReservations = (room.activeReservations || []).filter(r => r.bookingId !== bookingId);
            room.occupied = (room.occupied || 0) + 1;
            room.reserved = room.activeReservations.length;
            room.available = Math.max(0, room.capacity - room.occupied - room.reserved);
            
            // Notify any users on the waiting list that the room has been booked
            if (room.waitingList && room.waitingList.length > 0) {
                room.waitingList.forEach(w => {
                    this._notifyUser(w.userId, "This room has been successfully booked by another user. You have been removed from the waiting list.");
                });
                room.waitingList = [];
            }
            data[cfg.roomId] = room;
            this._save(data);
        },
        releaseSeat(roomType, bookingId) {
            const cfg = State.getRoomConfig(roomType);
            const data = this._load();
            let room = data[cfg.roomId];
            if (!room) return;
            room.activeReservations = (room.activeReservations || []).filter(r => r.bookingId !== bookingId);
            data[cfg.roomId] = room;
            this._save(data);
            this.cleanExpired();
        },
        joinWaitingList(roomType, user, phone) {
            const cfg = State.getRoomConfig(roomType);
            const data = this._load();
            let room = data[cfg.roomId];
            if (!room) return { position: 1 };
            if (!room.waitingList) room.waitingList = [];
            const existingIdx = room.waitingList.findIndex(w => w.userId === user);
            if (existingIdx !== -1) {
                return { position: existingIdx + 1 };
            }
            room.waitingList.push({
                userId: user,
                userName: user,
                userPhone: phone || '',
                joinedAt: Date.now()
            });
            data[cfg.roomId] = room;
            this._save(data);
            return { position: room.waitingList.length };
        }
    }
};