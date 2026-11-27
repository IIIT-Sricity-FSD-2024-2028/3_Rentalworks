// ===================================================================
//  Sign-up field rules shared by the guest signup and owner registration.
//  Each validator returns an error message, or '' when the value is fine.
// ===================================================================

/** Countries offered in sign-up: dial code, local phone length and postal code format. */
export const COUNTRIES = [
  { code: 'IN', name: 'India', dial: '+91', phoneLength: 10, phoneStart: /^[6-9]/, postal: /^[1-9]\d{5}$/, postalHint: '6-digit PIN code' },
  { code: 'US', name: 'United States', dial: '+1', phoneLength: 10, postal: /^\d{5}(-\d{4})?$/, postalHint: '5-digit ZIP code' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', phoneLength: 10, postal: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, postalHint: 'postcode, e.g. SW1A 1AA' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', phoneLength: 9, postal: /^\d{0,6}$/, postalHint: 'P.O. box (optional)' },
  { code: 'SG', name: 'Singapore', dial: '+65', phoneLength: 8, postal: /^\d{6}$/, postalHint: '6-digit postal code' },
  { code: 'AU', name: 'Australia', dial: '+61', phoneLength: 9, postal: /^\d{4}$/, postalHint: '4-digit postcode' },
  { code: 'CA', name: 'Canada', dial: '+1', phoneLength: 10, postal: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i, postalHint: 'postal code, e.g. K1A 0B1' },
  { code: 'NP', name: 'Nepal', dial: '+977', phoneLength: 10, postal: /^\d{5}$/, postalHint: '5-digit postal code' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', phoneLength: 9, postal: /^\d{5}$/, postalHint: '5-digit postal code' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', phoneLength: 10, postal: /^\d{4}$/, postalHint: '4-digit postal code' },
];

export const DEFAULT_COUNTRY = 'IN';
export const countryOf = (code) => COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];

/** Suggestions for the city box (any real city name is still accepted). */
export const INDIAN_CITIES = [
  'Ahmedabad', 'Bengaluru', 'Bhopal', 'Bhubaneswar', 'Chandigarh', 'Chennai', 'Coimbatore', 'Delhi', 'Gurugram', 'Guwahati',
  'Hyderabad', 'Indore', 'Jaipur', 'Kochi', 'Kolkata', 'Lucknow', 'Madurai', 'Mangaluru', 'Mumbai', 'Mysuru', 'Nagpur',
  'Noida', 'Pune', 'Surat', 'Thiruvananthapuram', 'Tiruchirappalli', 'Vadodara', 'Visakhapatnam', 'Vijayawada',
];

/** Strip everything but digits and cut to the country's length (used while typing). */
export const cleanPhone = (value, countryCode = DEFAULT_COUNTRY) =>
  String(value || '').replace(/\D/g, '').slice(0, countryOf(countryCode).phoneLength);

/** '9876543210' + IN → '+91 9876543210' (the format stored on the account). */
export const fullPhone = (digits, countryCode = DEFAULT_COUNTRY) => `${countryOf(countryCode).dial} ${digits}`;

export function validateName(value) {
  const v = String(value || '').trim();
  if (!v) return 'Full name is required';
  if (v.length < 2 || v.length > 60) return 'Name must be 2 to 60 characters';
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(v)) return 'Use letters only (spaces, dots and hyphens are allowed)';
  if (!/[A-Za-z]{2,}/.test(v)) return 'Enter your real name';
  return '';
}

export function validateEmail(value) {
  const v = String(value || '').trim();
  if (!v) return 'Email address is required';
  if (v.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v)) return 'Enter a valid email address, e.g. name@gmail.com';
  return '';
}

export function validatePhone(digits, countryCode = DEFAULT_COUNTRY) {
  const c = countryOf(countryCode);
  const v = String(digits || '');
  if (!v) return 'Phone number is required';
  if (!/^\d+$/.test(v)) return 'Use digits only';
  if (v.length !== c.phoneLength) return `${c.name} numbers have exactly ${c.phoneLength} digits`;
  if (c.phoneStart && !c.phoneStart.test(v)) return `${c.name} mobile numbers start with 6, 7, 8 or 9`;
  if (/^(\d)\1+$/.test(v)) return 'Enter a real phone number';
  return '';
}

export const MIN_AGE = 16;
export const MAX_AGE = 100;

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yearsAgo = (n) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};
/** Bounds for the date picker: no future dates, age between MIN_AGE and MAX_AGE. */
export const dobMax = () => isoDate(yearsAgo(MIN_AGE));
export const dobMin = () => isoDate(yearsAgo(MAX_AGE));

export function validateDob(value) {
  if (!value) return 'Date of birth is required';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Enter a valid date';
  if (d > new Date()) return 'Date of birth cannot be in the future';
  if (value > dobMax()) return `You must be at least ${MIN_AGE} years old`;
  if (value < dobMin()) return 'Enter a valid date of birth';
  return '';
}

export function validateCity(value) {
  const v = String(value || '').trim();
  if (!v) return 'City is required';
  if (v.length < 2 || v.length > 50) return 'City must be 2 to 50 characters';
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(v)) return 'City can contain letters, spaces, dots and hyphens only';
  if (/(.)\1{3,}/i.test(v)) return 'Enter a real city name';
  return '';
}

export function validateState(value) {
  const v = String(value || '').trim();
  if (!v) return 'State is required';
  if (v.length < 2 || v.length > 50 || !/^[A-Za-z][A-Za-z .&'-]*$/.test(v)) return 'Enter a valid state name';
  return '';
}

export function validateAddress(value) {
  const v = String(value || '').trim().replace(/\s+/g, ' ');
  if (!v) return 'Address is required';
  if (v.length < 10) return 'Address is too short. Include house / street and area';
  if (v.length > 200) return 'Address must be 200 characters or less';
  if (!/^[A-Za-z0-9 ,./#()'-]+$/.test(v)) return 'Address can contain letters, numbers and , . / # - ( ) only';
  if ((v.match(/[A-Za-z]/g) || []).length < 4) return 'Address must include a street or area name';
  if (v.split(/[ ,]+/).filter(Boolean).length < 2) return 'Write the address in at least two parts, e.g. "12 MG Road, Indiranagar"';
  if (/(.)\1{4,}/i.test(v)) return 'Enter a real address';
  return '';
}

export function validatePostalCode(value, countryCode = DEFAULT_COUNTRY) {
  const c = countryOf(countryCode);
  const v = String(value || '').trim();
  if (!v && c.code === 'AE') return '';
  if (!v) return `Enter your ${c.postalHint}`;
  if (!c.postal.test(v)) return `Enter a valid ${c.postalHint}`;
  return '';
}

export function validatePassword(value) {
  const v = String(value || '');
  if (v.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Use both letters and numbers';
  return '';
}
