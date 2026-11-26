import { NotificationReceipt } from './notification-receipt.entity';
import { Issue } from '../issues/issue.entity';
import * as bcrypt from 'bcrypt';
import { WardenNotification } from '../warden-notifications/warden-notification.entity';
import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Property } from '../properties/property.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { Subscription } from './subscription.entity';
import { Booking } from '../bookings/booking.entity';
import { SUBSCRIPTION_PLANS, planTypeOf } from './subscription-plans';

@Injectable()
export class OwnerService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(Complaint)
    private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
  ) {}

  async getDashboardStats(ownerId: number) {
    const properties = await this.propertyRepo.find({
      where: { ownerId: ownerId },
    });

    let totalRooms = 0;
    let occupiedRooms = 0;
    let monthlyRevenue = 0;

    for (let i = 0; i < properties.length; i++) {
      const p = properties[i];
      const tRooms = p.totalRooms ?? 0;
      const oRooms = p.occupiedRooms || 0;
      const rent = p.monthlyRent ?? p.rentMin ?? 0;

      totalRooms = totalRooms + tRooms;
      occupiedRooms = occupiedRooms + oRooms;
      monthlyRevenue = monthlyRevenue + (rent * oRooms);
    }

    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    const propIds = properties.map((p) => p.id);
    let allComplaints: Complaint[] = [];

    if (propIds.length > 0) {
      allComplaints = await this.complaintRepo.find({
        where: { propertyId: In(propIds) },
      });
    }

    let openIssues = 0;
    let inProgressIssues = 0;
    let resolvedIssues = 0;

    for (let j = 0; j < allComplaints.length; j++) {
      const status = (allComplaints[j].status || '').toLowerCase();
      if (status === 'open') {
        openIssues = openIssues + 1;
      } else if (status === 'in progress' || status === 'in-progress') {
        inProgressIssues = inProgressIssues + 1;
      } else if (status === 'resolved') {
        resolvedIssues = resolvedIssues + 1;
      }
    }

    const notifications = (await this.getNotifications(ownerId)).slice(0, 5);

    return {
      totalProperties: properties.length,
      totalRooms: totalRooms,
      occupiedRooms: occupiedRooms,
      occupancyRate: occupancyRate,
      monthlyRevenue: monthlyRevenue,
      issues: {
        total: allComplaints.length,
        open: openIssues,
        inProgress: inProgressIssues,
        resolved: resolvedIssues,
      },
      recentActivity: notifications,
    };
  }

  async getProfile(ownerId: number) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      company: user.company || '',
      city: user.city || '',
      state: user.state || '',
      pincode: user.pincode || '',
      bio:
        user.bio ||
        '',
      avatar: user.avatar || null,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan || '',
    };
  }

  async updateProfile(ownerId: number, updateData: any) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }

    if (updateData.name !== undefined && (typeof updateData.name !== 'string' || !updateData.name.trim())) throw new BadRequestException('Name is required');
    if (updateData.email !== undefined && (typeof updateData.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email))) throw new BadRequestException('Valid email is required');
    if (updateData.name !== undefined) user.name = updateData.name.trim();
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.company !== undefined) user.company = updateData.company;
    if (updateData.city !== undefined) user.city = updateData.city;
    if (updateData.state !== undefined) user.state = updateData.state;
    if (updateData.pincode !== undefined) user.pincode = updateData.pincode;
    if (updateData.bio !== undefined) user.bio = updateData.bio;
    if (updateData.avatar !== undefined) user.avatar = updateData.avatar;

    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      phone: saved.phone,
      company: saved.company,
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
      bio: saved.bio,
      avatar: saved.avatar,
    };
  }

  async getPolicy(ownerId: number) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }

    return user.policy || {};
  }

  async updatePolicy(ownerId: number, policyData: any) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }

    user.policy = Object.assign({}, user.policy || {}, policyData);
    await this.userRepo.save(user);
    return user.policy;
  }

  async getSubscription(ownerId: number) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }
    // The latest active row is the current plan (admins activate / change it).
    const subRecord = await this.subscriptionRepo.findOne({
      where: { ownerId, status: In(['active', 'ACTIVE']) },
      order: { id: 'DESC' },
    });
    if (!subRecord) return { currentPlan: null, status: 'inactive', monthlyFee: 0, renewalDate: null };

    const type = planTypeOf(subRecord.planType || subRecord.planName);
    const propertiesCount = await this.propertyRepo.count({ where: { ownerId } });
    return {
      id: subRecord.id,
      // Older rows store the plan in planType only, newer ones in both.
      currentPlan: type ? SUBSCRIPTION_PLANS[type].displayName : subRecord.planName || subRecord.planType,
      planType: type,
      status: 'active',
      monthlyFee: Number(subRecord.amount ?? subRecord.monthlyFee ?? 0),
      billingCycle: subRecord.billingCycle,
      propertiesManaged: propertiesCount,
      startDate: subRecord.startDate || null,
      renewalDate: subRecord.endDate || null,
    };
  }

  async updateSubscription(ownerId: number, planData: any) {
    throw new BadRequestException('Online subscription checkout is not configured. Contact the administrator to arrange billing.');
  }

  async getNotifications(ownerId: number) {
    const notifications = await this.notificationRepo.find({ where: [{ userId: ownerId }, { userId: IsNull() }, { byUserId: ownerId }], order: { id: 'DESC' } });
    const receipts = await this.userRepo.manager.getRepository(NotificationReceipt).findBy({ userId: ownerId });
    return notifications.filter(n => {
      const receipt = receipts.find(r => r.notificationId === n.id);
      const forOwners = !n.targetRole || ['owner', 'all'].includes(n.targetRole);
      // A message with an explicit recipient list goes to those users only.
      const hasRecipientList = Array.isArray(n.recipientUserIds) && n.recipientUserIds.length > 0;
      const audience = n.userId === ownerId ||
        n.byUserId === ownerId ||
        (hasRecipientList && !!n.recipientUserIds?.includes(ownerId) && forOwners) ||
        (!n.userId && !hasRecipientList && forOwners);
      return audience && !receipt?.dismissed && new Date(n.sentAt).getTime() <= Date.now();
    }).map(n => {
      const receipt = receipts.find(r => r.notificationId === n.id);
      const read = receipt?.read || (n.userId === ownerId && (n.read || n.isRead)) || false;
      return Object.assign({}, n, { read, isRead: read });
    });
  }

  async updateNotificationReceipt(ownerId: number, notificationId: number, dismissed = false) {
    const visible = await this.getNotifications(ownerId);
    if (!visible.some(n => n.id === notificationId)) throw new NotFoundException('Notification not found');
    await this.userRepo.manager.getRepository(NotificationReceipt).upsert({ userId: ownerId, notificationId, read: true, dismissed }, ['userId', 'notificationId']);
    return { success: true };
  }

  async markAllNotificationsRead(ownerId: number) {
    const notifications = await this.getNotifications(ownerId);
    if (notifications.length) await this.userRepo.manager.getRepository(NotificationReceipt).upsert(notifications.map(n => ({ userId: ownerId, notificationId: n.id, read: true })), ['userId', 'notificationId']);
    return { success: true };
  }

  async clearAllNotifications(ownerId: number) {
    const notifications = await this.getNotifications(ownerId);
    if (notifications.length) {
      await this.userRepo.manager.getRepository(NotificationReceipt).upsert(
        notifications.map(n => ({ userId: ownerId, notificationId: n.id, read: true, dismissed: true })),
        ['userId', 'notificationId'],
      );
    }
    return { success: true, cleared: notifications.length };
  }

  async getIssues(ownerId: number) {
    const complaints = await this.complaintRepo.find({ where: { property: { ownerId } }, relations: { property: true, tenant: true }, order: { id: 'DESC' } });
    const issues = await this.userRepo.manager.getRepository(Issue).find({ where: { property: { ownerId } }, relations: { property: true, tenant: true }, order: { id: 'DESC' } });
    // Separate IDs prevent collisions between the two existing issue tables.
    return complaints.concat(issues.map(i => Object.assign({}, i, { id: 'issue-' + i.id, reportedAt: i.createdAt.toISOString() })) as any);
  }

  async updateTenantIssue(id: number, status: string) {
    if (!['open', 'in-progress', 'resolved'].includes(status)) throw new BadRequestException('Invalid issue status');
    return this.userRepo.manager.transaction(async manager => {
      const repo = manager.getRepository(Issue);
      const issue = await repo.findOneByOrFail({ id });
      issue.status = status.replace('-', '_');
      if (status === 'resolved') issue.resolvedAt = new Date();
      await repo.save(issue);
      await manager.getRepository(Notification).save({ title: 'Issue status updated', message: issue.title + ': ' + status, type: 'issue', priority: issue.priority, userId: issue.tenantId, sentAt: new Date().toISOString() });
      return issue;
    });
  }

  async removeTenantIssue(id: number) {
    await this.userRepo.manager.getRepository(Issue).delete(id);
    return { success: true };
  }

  async changePassword(ownerId: number, body: { currentPassword: string; newPassword: string }) {
    if (typeof body.newPassword !== 'string' || body.newPassword.length < 8) throw new BadRequestException('Use at least 8 characters');
    const user = await this.userRepo.createQueryBuilder('user').addSelect('user.password').where('user.id = :ownerId', { ownerId }).getOne();
    if (!user?.password || typeof body.currentPassword !== 'string' || !await bcrypt.compare(body.currentPassword, user.password)) throw new UnauthorizedException('Current password is incorrect');
    user.password = await bcrypt.hash(body.newPassword, 12);
    await this.userRepo.save(user);
    return { success: true };
  }

  async sendNotification(ownerId: number, body: { title: string; message: string; targetRole?: string; priority?: string }) {
    const owner = await this.getProfile(ownerId);
    if (!body.title?.trim() || !body.message?.trim()) throw new BadRequestException('Title and message are required');
    const role = (body.targetRole || 'all').toLowerCase();
    if (!['admin', 'warden', 'tenant', 'all'].includes(role)) {
      throw new BadRequestException('Recipient must be Warden, Tenant, Admin, or All');
    }
    return this.userRepo.manager.transaction(async manager => {
      let count = 0;
      const properties = await manager.getRepository(Property).findBy({ ownerId });

      // Notify Wardens
      if (role === 'warden' || role === 'all') {
        for (const property of properties) {
          await manager.getRepository(WardenNotification).save({
            title: body.title,
            message: body.message,
            type: 'owner_message',
            priority: 'normal',
            senderName: owner.name,
            senderRole: 'owner',
            propertyId: property.id,
            propertyName: property.name,
          });
          count++;
        }
      }

      // Notify only tenants currently staying in this owner's properties.
      if (role === 'tenant' || role === 'all') {
        const propertyIds = properties.map((p) => p.id);
        const bookings = propertyIds.length
          ? await manager.getRepository(Booking).find({ where: { propertyId: In(propertyIds), status: In(['active', 'confirmed']) }, select: { tenantId: true } })
          : [];
        const tenantIds = [...new Set(bookings.map((b) => b.tenantId).filter(Boolean))];
        const tenants = tenantIds.length
          ? await manager.getRepository(User).findBy({ id: In(tenantIds), role: 'tenant', status: 'active' })
          : [];
        for (const tenant of tenants) {
          await manager.getRepository(Notification).save({
            title: body.title,
            message: body.message,
            type: 'announcement',
            priority: 'normal',
            byUserId: ownerId,
            userId: tenant.id,
            targetRole: 'tenant',
            sentAt: new Date().toISOString(),
          });
          count++;
        }
      }

      // Notify Admins & Super Admins
      if (role === 'admin' || role === 'all') {
        const admins = await manager.getRepository(User).find({
          where: [
            { role: 'admin', status: 'active' },
            { role: 'super_admin', status: 'active' },
          ],
        });
        for (const admin of admins) {
          await manager.getRepository(Notification).save({
            title: `[From Owner ${owner.name}]: ${body.title}`,
            message: body.message,
            type: 'alert',
            priority: body.priority || 'normal',
            byUserId: ownerId,
            userId: admin.id,
            targetRole: admin.role,
            sentAt: new Date().toISOString(),
          });
          count++;
        }
      }

      // Always create a sent copy for the owner's own notification history
      await manager.getRepository(Notification).save({
        title: `Sent to ${role.toUpperCase()}: ${body.title}`,
        message: body.message,
        type: 'info',
        priority: 'normal',
        byUserId: ownerId,
        userId: ownerId,
        targetRole: 'owner',
        read: true,
        sentAt: new Date().toISOString(),
      });
      count++;

      return { delivered: count, success: true };
    });
  }
}
