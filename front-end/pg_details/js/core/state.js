const State = {
    data: {
        currentUser: null,
        currentPage: 'landing',
        currentRmIndex: 0,
        selectedRm: null,
        activeBooking: null,
        
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
        // Read directly from the newly established centralized state namespace
        const saved = localStorage.getItem('sunrise_pg_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.data.currentUser = parsed.currentUser || null;
                this.data.currentPage = parsed.currentPage || 'landing';
                this.data.bookings = parsed.bookings || [];
                this.data.transactions = parsed.transactions || [];
                this.data.selectedRm = parsed.selectedRm || null;
                this.data.activeBooking = parsed.activeBooking || null;
            } catch(e){}
        }
    },
    save() { localStorage.setItem('sunrise_pg_state', JSON.stringify(this.data)); }
};