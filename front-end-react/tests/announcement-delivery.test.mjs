import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../admin-react/src/services/api.js';
import { getWardenNotificationsApi, markWardenNotificationReadApi } from '../warden-dashboard-react/src/utils/api.js';

function storage(entries) {
  return { getItem: key => entries[key] ?? null, setItem: (key, value) => { entries[key] = value; } };
}

test('admin requests its own server inbox and never resurrects another account cache', async () => {
  globalThis.sessionStorage = storage({ pg_user: JSON.stringify({ id: 42, role: 'admin' }) });
  globalThis.localStorage = storage({ admin_notifs: '[{"id":999}]', cross_notifications: '[{"id":888}]' });
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers['x-user-id'], '42');
    assert.ok(url.endsWith('/notifications'));
    return { ok: true, json: async () => [{ id: 7 }] };
  };
  assert.deepEqual(await api.getNotifications(), [{ id: 7 }]);
  globalThis.fetch = async () => ({ ok: true, json: async () => [] });
  assert.deepEqual(await api.getNotifications(), []);
  globalThis.sessionStorage = storage({});
  await assert.rejects(api.getNotifications(), /sign in/);
});

test('warden receives platform announcements even when its separate inbox fails', async () => {
  globalThis.sessionStorage = storage({ warden_user: JSON.stringify({ id: 53, role: 'warden' }) });
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers['x-user-id'], '53');
    if (url.endsWith('/warden-notifications')) throw new Error('Unavailable');
    return { ok: true, json: async () => [{ id: 7, byUser: { role: 'super_admin', name: 'Super Admin' }, title: 'Notice' }] };
  };
  const inbox = await getWardenNotificationsApi();
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].id, 'platform-7');
  assert.equal(inbox[0].senderRole, 'super_admin');
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/notifications/7/read'));
    assert.equal(options.method, 'PUT');
    return { ok: true, json: async () => ({}) };
  };
  await markWardenNotificationReadApi(inbox[0].id);
});
