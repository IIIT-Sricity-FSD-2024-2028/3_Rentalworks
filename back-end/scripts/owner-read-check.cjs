// Read-only smoke check against the configured database. No test records are inserted.
require('reflect-metadata');
const { DataSource } = require('typeorm');
const path = require('path');
const { OwnerService } = require('../dist/src/owner/owner.service');
const { Property } = require('../dist/src/properties/property.entity');
const { Complaint } = require('../dist/src/complaints/complaint.entity');
const { Notification } = require('../dist/src/notifications/notification.entity');
const { User } = require('../dist/src/users/user.entity');
const { Subscription } = require('../dist/src/owner/subscription.entity');
const db = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL, entities: [path.join(__dirname, '../dist/src/**/*.entity.js')], synchronize: false, migrationsRun: false });
(async () => {
  try {
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SET TRANSACTION READ ONLY');
    try {
      const repo = entity => runner.manager.getRepository(entity);
      const owner = await repo(User).findOneBy({ role: 'owner', status: 'active' });
      if (!owner) throw new Error('No active owner available for read-only verification');
      const service = new OwnerService(repo(Property), repo(Complaint), repo(Notification), repo(User), repo(Subscription));
      const results = await Promise.all([service.getProfile(owner.id), service.getPolicy(owner.id), service.getSubscription(owner.id), service.getIssues(owner.id), service.getNotifications(owner.id), repo(Property).find({ where: { ownerId: owner.id }, relations: { owner: true, roomEntities: true } })]);
      console.log(JSON.stringify({ passed: true, checks: ['profile', 'policy', 'subscription', 'issues', 'notifications', 'properties'], counts: { issues: results[3].length, notifications: results[4].length, properties: results[5].length } }));
    } finally { await runner.rollbackTransaction(); await runner.release(); }
  } catch (error) { console.error(JSON.stringify({ passed: false, message: error.message })); process.exitCode = 1; }
  finally { if (db.isInitialized) await db.destroy(); }
})();
