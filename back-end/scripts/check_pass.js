const bcrypt = require('bcrypt');
const hash = '$2b$10$8pJaMnDIg2g/9QYUzmDPQ.AYm9OG1QKZaAd9SjpsATYg4HxlrlEoC';

async function test() {
  const candidates = ['admin123', 'superadmin', 'password123', 'admin', 'superadmin123', 'SuperAdmin123', 'Superadmin123!', 'Admin@123'];
  for (const c of candidates) {
    if (await bcrypt.compare(c, hash)) {
      console.log('MATCH FOUND:', c);
      return;
    }
  }
  console.log('No match found in candidates');
}

test();
