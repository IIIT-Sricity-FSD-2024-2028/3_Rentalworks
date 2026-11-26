import { formatINR } from '../utils/normalize';
import { PLATFORM_FEE } from '../features/booking/bookingSlice';

/**
 * FAQs for one PG, built only from what the owner listed. Questions whose
 * answer we don't have are left out rather than filled with generic claims.
 */
export function buildFaqs(pg) {
  if (!pg) return [];
  const faqs = [
    {
      q: 'How does booking work?',
      a: `Pick a room with a free bed and pay the first month's rent, the security deposit and a ${formatINR(PLATFORM_FEE)} booking fee online. A bed is assigned to you straight away, and the warden is told you're moving in.`,
    },
  ];

  if (pg.amenityLabels.length) {
    faqs.push({
      q: 'Which facilities does this PG have?',
      a: `The owner lists: ${pg.amenityLabels.join(', ')}. Ask the owner if you need details on any of them.`,
    });
  }

  const depositRooms = pg.rooms.filter((r) => r.deposit > 0);
  if (depositRooms.length) {
    const min = Math.min(...depositRooms.map((r) => r.deposit));
    const max = Math.max(...depositRooms.map((r) => r.deposit));
    faqs.push({
      q: 'How much is the security deposit?',
      a: `It is 40% of the room's monthly rent: ${min === max ? formatINR(min) : `${formatINR(min)} to ${formatINR(max)}`} depending on the room. You pay it together with the first month's rent.`,
    });
  }

  if (pg.gender !== 'unisex') {
    faqs.push({
      q: 'Who can stay here?',
      a: `${pg.title} is a ${pg.gender === 'girls' ? "girls'" : "boys'"} PG. Your profile's gender is checked before you can book.`,
    });
  }

  faqs.push({
    q: 'Can I visit before booking?',
    a: pg.owner?.phone || pg.owner?.email
      ? 'Yes. Contact the owner using the details at the bottom of this page to arrange a visit.'
      : 'Owner contact details are not available for this listing yet. You can still look at the rooms and prices here.',
  });

  return faqs;
}
