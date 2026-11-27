import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDetails, validatePassword } from '../super-admin-react/src/pages/profile-validation.js';

test('profile fields reject empty, malformed and oversized values', () => {
  const good = { name: ' Super Admin ', email: ' admin@example.com ', phone: '+91 98765-43210' };
  assert.deepEqual(validateDetails(good), {});
  for (const [key, value] of [['name', ' '], ['name', 'a'], ['name', 'a'.repeat(101)], ['email', 'invalid'], ['phone', ''], ['phone', '----------'], ['phone', '1234']]) {
    assert.ok(validateDetails({ ...good, [key]: value })[key]);
  }
});
test('password requires current, matching confirmation, changed value and bcrypt byte limit', () => {
  const good = { current: 'old-pass', next: 'new-pass', confirm: 'new-pass' };
  assert.deepEqual(validatePassword(good), {});
  for (const change of [{ current: '' }, { next: 'short' }, { next: '      ' }, { next: 'é'.repeat(37) }, { next: 'old-pass', confirm: 'old-pass' }, { confirm: 'mismatch' }]) {
    assert.ok(Object.keys(validatePassword({ ...good, ...change })).length);
  }
});
