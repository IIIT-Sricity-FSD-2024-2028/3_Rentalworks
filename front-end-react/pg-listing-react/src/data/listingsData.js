export const RAW_LISTINGS = [
  {
    id: 1,
    title: 'Sunrise PG Residency',
    location: 'Koramangala, Bangalore',
    price: 10000,
    rating: 4.8,
    reviewsCount: 1394,
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80',
    room: 'double',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'unisex',
    distance: 1,
    amenities: ['wifi', 'ac', 'cctv', 'laundry', 'parking', 'meals', 'backup', 'water'],
    features: [
      { icon: 'bed', text: 'Double Sharing' },
      { icon: 'restaurant', text: 'With Food' },
      { icon: 'wifi', text: 'WiFi' },
      { icon: 'ac_unit', text: 'AC' }
    ],
    note: 'Close to IT parks & metro',
    about: 'Welcome to Sunrise PG Residency, a premium paying guest accommodation located in the heart of Koramangala, one of Bangalore’s most vibrant neighbourhoods. Our property offers comfortable living spaces designed for working professionals and students who value convenience, community, and quality.',
    stats: {
      residents: '50+',
      security: '24/7',
      backup: '100%',
      established: '5+ Years'
    },
    rooms: [
      {
        type: 'Single Room',
        sharing: 'single',
        rent: 16000,
        deposit: 5000,
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
        feature: 'Attached Bathroom & AC',
        available: true,
        capacity: 1,
        occupied: 0
      },
      {
        type: 'Double Sharing',
        sharing: 'double',
        rent: 8500,
        deposit: 3500,
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600',
        feature: 'Spacious Balcony & Attached Washroom',
        available: true,
        capacity: 2,
        occupied: 1
      },
      {
        type: 'Triple Sharing',
        sharing: 'triple',
        rent: 6500,
        deposit: 3000,
        image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600',
        feature: 'Dedicated Study Desks & Lockers',
        available: true,
        capacity: 3,
        occupied: 1
      }
    ]
  },
  {
    id: 2,
    title: 'Sri Sai Boys PG',
    location: 'Anna Nagar, Chennai',
    price: 7500,
    rating: 4.5,
    reviewsCount: 840,
    image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1600&q=80',
    room: 'double',
    food: 'food',
    foodtype: 'vegnonveg',
    gender: 'boys',
    distance: 0.5,
    amenities: ['wifi', 'ac', 'geyser', 'parking', 'cctv'],
    features: [
      { icon: 'bed', text: 'Double Sharing' },
      { icon: 'restaurant', text: 'Veg + Non-Veg' },
      { icon: 'wifi', text: 'WiFi' }
    ],
    note: '500m from University',
    about: 'Sri Sai Boys PG provides prime accommodation in Anna Nagar with round-the-clock water, CCTV surveillance, high-speed WiFi, and home-style south and north Indian food.',
    stats: {
      residents: '40+',
      security: '24/7',
      backup: '100%',
      established: '4+ Years'
    },
    rooms: [
      {
        type: 'Single Room',
        sharing: 'single',
        rent: 12000,
        deposit: 4000,
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
        feature: 'Private attached bath & study desk',
        available: true,
        capacity: 1,
        occupied: 0
      },
      {
        type: 'Double Sharing',
        sharing: 'double',
        rent: 7500,
        deposit: 3000,
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=600',
        feature: 'Attached Bath & Air Conditioning',
        available: true,
        capacity: 2,
        occupied: 0
      }
    ]
  },
  {
    id: 3,
    title: 'Lakshmi Girls PG',
    location: 'Velachery, Chennai',
    price: 8500,
    rating: 4.7,
    reviewsCount: 950,
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80',
    room: 'triple',
    food: 'food',
    foodtype: 'vegonly',
    gender: 'girls',
    distance: 1,
    amenities: ['wifi', 'ac', 'cctv', 'laundry'],
    features: [
      { icon: 'bed', text: 'Triple Sharing' },
      { icon: 'eco', text: 'Veg Only' },
      { icon: 'wifi', text: 'WiFi' },
      { icon: 'ac_unit', text: 'AC' }
    ],
    note: 'Near Phoenix Mall',
    about: 'Safe, hygienic, and modern accommodation exclusively for women and female students with biometric security, in-house warden, and quality vegetarian meals.',
    stats: {
      residents: '60+',
      security: '24/7 CCTV & Biometric',
      backup: '100%',
      established: '6+ Years'
    },
    rooms: [
      {
        type: 'Single Room',
        sharing: 'single',
        rent: 14000,
        deposit: 4500,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',
        feature: 'Balcony view & high-speed Wi-Fi',
        available: true,
        capacity: 1,
        occupied: 0
      },
      {
        type: 'Triple Sharing',
        sharing: 'triple',
        rent: 8500,
        deposit: 3500,
        image: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600',
        feature: 'Furnished study desk & lockers',
        available: true,
        capacity: 3,
        occupied: 1
      }
    ]
  }
];

export const RAW_ROOMMATES = [
  {
    id: 101,
    name: 'Amit Sharma',
    pg: 'Sunrise PG Residency',
    room: 'Room 101',
    roomNum: '101',
    sharing: 'Double Sharing',
    age: 24,
    job: 'Software Engineer',
    company: 'Infosys',
    hobbies: ['Gaming', 'Coding', 'Reading'],
    sleepHabit: 'Night Owl (12 AM - 8 AM)',
    cleanliness: 'High (Daily Cleanup)',
    foodHabit: 'Vegetarian',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
    compatibility: 96
  },
  {
    id: 102,
    name: 'Rohan Kumar',
    pg: 'Sunrise PG Residency',
    room: 'Room 201',
    roomNum: '201',
    sharing: 'Double Sharing',
    age: 25,
    job: 'Product Designer',
    company: 'Swiggy',
    hobbies: ['Music', 'Fitness', 'Coffee'],
    sleepHabit: 'Early Riser (6 AM - 11 PM)',
    cleanliness: 'Moderate & Organized',
    foodHabit: 'Eggetarian / Non-Veg',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500',
    compatibility: 91
  },
  {
    id: 103,
    name: 'Rahul Singh',
    pg: 'Sunrise PG Residency',
    room: 'Room 202',
    roomNum: '202',
    sharing: 'Triple Sharing',
    age: 26,
    job: 'Data Scientist',
    company: 'Flipkart',
    hobbies: ['Chess', 'Gym', 'Badminton'],
    sleepHabit: 'Flexible Schedule',
    cleanliness: 'Very Clean',
    foodHabit: 'Flexible Diet',
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500',
    compatibility: 88
  }
];

export const RAW_FAQS = [
  {
    q: 'How does the booking & tenant onboarding workflow operate?',
    a: 'When you complete payment for your selected room, our system converts your guest account into an active tenant record in PostgreSQL, saves your login credentials, updates room occupancy, and sends an automated onboarding alert to the PG warden.'
  },
  {
    q: 'What is included in the monthly rent?',
    a: 'Rent covers your fully furnished room, 100 Mbps broadband WiFi, daily housekeeping, 3 nutritious meals (as per plan), 24/7 security, power backup, and utility charges.'
  },
  {
    q: 'Is the security deposit refundable?',
    a: 'Yes, the security deposit is 100% refundable at the time of checkout, subject to our standard 30-day move-out notice.'
  },
  {
    q: 'Can I visit the property before making a payment?',
    a: 'Yes, you can contact the property owner directly through the "Contact Owner" button or schedule an in-person tour.'
  }
];
