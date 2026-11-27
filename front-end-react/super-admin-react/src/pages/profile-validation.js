export function validateDetails(details) {
  const errors = {};
  const name = details.name.trim();
  const email = details.email.trim();
  const phone = details.phone.trim().replace(/[ ()-]/g, '');
  if (name.length < 2 || name.length > 100 || /[\u0000-\u001f\u007f<>]/.test(name)) errors.name = 'Enter a name of 2–100 characters without control characters or angle brackets.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!/^\+?[1-9]\d{9,14}$/.test(phone)) errors.phone = 'Enter 10–15 digits, optionally starting with +.';
  return errors;
}

export function validatePassword(password) {
  const errors = {};
  const bytes = value => new TextEncoder().encode(value).length;
  if (!password.current || bytes(password.current) > 72) errors.current = 'Enter your current password (maximum 72 bytes).';
  if ([...password.next].length < 6 || !password.next.trim() || password.next !== password.next.trim() || bytes(password.next) > 72) errors.next = 'Use at least 6 characters and at most 72 bytes, without leading or trailing spaces.';
  else if (password.next === password.current) errors.next = 'Choose a password different from your current password.';
  if (!password.confirm || password.confirm !== password.next) errors.confirm = 'Confirm your new password exactly.';
  return errors;
}
