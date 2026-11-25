const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Neon PostgreSQL.');

  // Create table roommate_profiles
  await client.query(`
    CREATE TABLE IF NOT EXISTS roommate_profiles (
      id SERIAL PRIMARY KEY,
      "userId" INT NULL,
      "propertyId" INT NOT NULL DEFAULT 1,
      "roomNumber" VARCHAR(50) NULL,
      "roomType" VARCHAR(100) NULL,
      name VARCHAR(255) NOT NULL,
      age INT NOT NULL,
      profession VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      "sleepSchedule" VARCHAR(100) NOT NULL,
      cleanliness VARCHAR(100) NOT NULL,
      "foodHabit" VARCHAR(100) NOT NULL,
      drinking VARCHAR(100) NOT NULL,
      smoking VARCHAR(100) NOT NULL,
      interests JSONB NOT NULL DEFAULT '[]'::jsonb,
      avatar VARCHAR(500) NULL,
      "optedSmartMatch" BOOLEAN NOT NULL DEFAULT TRUE,
      "isTenant" BOOLEAN NOT NULL DEFAULT FALSE,
      "selectedRoommateId" INT NULL,
      "matchPercentage" INT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Table roommate_profiles created successfully.');

  // Check if initial tenant profiles exist
  const countRes = await client.query('SELECT COUNT(*) FROM roommate_profiles WHERE "isTenant" = TRUE;');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log('Seeding initial tenant roommate profiles...');
    const seedData = [
      {
        propertyId: 1,
        roomNumber: '101',
        roomType: 'Double Sharing',
        name: 'Amit Sharma',
        age: 24,
        profession: 'Software Engineer',
        company: 'Infosys',
        sleepSchedule: 'Night Owl (12 AM - 8 AM)',
        cleanliness: 'High (Daily Cleanup)',
        foodHabit: 'Vegetarian',
        drinking: 'Non-Drinker',
        smoking: 'Non-Smoker',
        interests: JSON.stringify(['Gaming', 'Coding', 'Reading']),
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
        optedSmartMatch: true,
        isTenant: true,
      },
      {
        propertyId: 1,
        roomNumber: '201',
        roomType: 'Double Sharing',
        name: 'Rohan Kumar',
        age: 25,
        profession: 'Product Designer',
        company: 'Swiggy',
        sleepSchedule: 'Early Riser (6 AM - 11 PM)',
        cleanliness: 'Moderate & Organized',
        foodHabit: 'Eggetarian / Non-Veg',
        drinking: 'Occasional Drinker',
        smoking: 'Non-Smoker',
        interests: JSON.stringify(['Music', 'Fitness', 'Coffee']),
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500',
        optedSmartMatch: true,
        isTenant: true,
      },
      {
        propertyId: 1,
        roomNumber: '202',
        roomType: 'Triple Sharing',
        name: 'Rahul Singh',
        age: 26,
        profession: 'Data Scientist',
        company: 'Flipkart',
        sleepSchedule: 'Flexible Schedule',
        cleanliness: 'High (Daily Cleanup)',
        foodHabit: 'Flexible Diet',
        drinking: 'Non-Drinker',
        smoking: 'Non-Smoker',
        interests: JSON.stringify(['Chess', 'Gym', 'Badminton']),
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500',
        optedSmartMatch: true,
        isTenant: true,
      },
      {
        propertyId: 2,
        roomNumber: '202',
        roomType: 'Double Sharing',
        name: 'Karthik V',
        age: 23,
        profession: 'Cloud Engineer',
        company: 'Amazon AWS',
        sleepSchedule: 'Night Owl (12 AM - 8 AM)',
        cleanliness: 'Moderate & Organized',
        foodHabit: 'Non-Vegetarian',
        drinking: 'Occasional Drinker',
        smoking: 'Non-Smoker',
        interests: JSON.stringify(['Gaming', 'Fitness', 'Tech']),
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500',
        optedSmartMatch: true,
        isTenant: true,
      }
    ];

    for (const item of seedData) {
      await client.query(`
        INSERT INTO roommate_profiles (
          "propertyId", "roomNumber", "roomType", name, age, profession, company,
          "sleepSchedule", cleanliness, "foodHabit", drinking, smoking,
          interests, avatar, "optedSmartMatch", "isTenant"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);
      `, [
        item.propertyId, item.roomNumber, item.roomType, item.name, item.age, item.profession, item.company,
        item.sleepSchedule, item.cleanliness, item.foodHabit, item.drinking, item.smoking,
        item.interests, item.avatar, item.optedSmartMatch, item.isTenant
      ]);
    }
    console.log('Seeded tenant roommate profiles successfully.');
  }

  const res = await client.query('SELECT id, name, profession, company, "sleepSchedule", "cleanliness", "foodHabit" FROM roommate_profiles;');
  console.table(res.rows);

  await client.end();
}

run().catch(console.error);
