import { config } from 'dotenv';
config();

const dbUrl = process.env.DATABASE_URL || '';
const dbUrlUnpooled = process.env.DATABASE_URL_UNPOOLED || '';
const branch = process.env.NEON_BRANCH || '';

try {
  let u1 = '';
  if (dbUrl) {
    const parsed1 = new URL(dbUrl);
    u1 = parsed1.protocol + '//' + parsed1.username + ':***@' + parsed1.host + parsed1.pathname;
  }
  let u2 = '';
  if (dbUrlUnpooled) {
    const parsed2 = new URL(dbUrlUnpooled);
    u2 = parsed2.protocol + '//' + parsed2.username + ':***@' + parsed2.host + parsed2.pathname;
  }
  console.log('DATABASE_URL target host:', u1);
  console.log('DATABASE_URL_UNPOOLED target host:', u2);
  console.log('NEON_BRANCH:', branch);
} catch (e) {
  console.error('Error parsing URLs:', e.message);
}
