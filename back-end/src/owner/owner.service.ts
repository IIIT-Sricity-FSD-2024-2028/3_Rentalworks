import { ownerPropertySummary } from './property-summary';
import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Property } from '../properties/property.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { Subscription } from './subscription.entity';

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
      relations: { roomEntities: true },
    });

    let totalRooms = 0;
    let occupiedRooms = 0;
    let monthlyRevenue = 0;

    for (let i = 0; i < properties.length; i++) {
      const p = ownerPropertySummary(properties[i]);
      const tRooms = p.totalRooms ?? 0;
      const oRooms = p.occupiedRooms || 0;
      const rent = p.monthlyRent ?? p.rentMin ?? 0;

      totalRooms = totalRooms + tRooms;
      occupiedRooms = occupiedRooms + oRooms;
      monthlyRevenue += 'estimatedMonthlyRent' in p ? p.estimatedMonthlyRent : rent * oRooms;
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

    const notifications = await this.notificationRepo.find({
      where: { userId: ownerId },
      order: { id: 'DESC' },
      take: 5,
    });

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
      bio: user.bio || '',
      avatar: user.avatar || null,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan || null,
    };
  }

  async updateProfile(ownerId: number, updateData: any) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }

    if (updateData.name !== undefined) user.name = updateData.name;
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

  async changePassword(ownerId: number, currentPassword: string, newPassword: string) {
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    const user = await this.userRepo.createQueryBuilder('user')
      .where('user.id = :ownerId', { ownerId })
      .addSelect('user.password')
      .getOne();
    if (!user || user.role !== 'owner') throw new NotFoundException('Owner not found');
    if (!await bcrypt.compare(currentPassword || '', user.password || '')) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);
    return { message: 'Password updated' };
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

    const plans = await this.subscriptionRepo.query(
      'SELECT id, name, "displayName", description, price, "durationMonths", currency, features, badge FROM subscription_plans WHERE "isActive" = true ORDER BY "sortOrder", id',
    );
    const records = await this.subscriptionRepo.query(
      `SELECT s.*, p."displayName", p.features FROM subscriptions s
       LEFT JOIN subscription_plans p ON p.id = s."planId"
       WHERE s."ownerId" = $1 ORDER BY s.id DESC`, [ownerId],
    );
    const current = records.find(record => record.status.toLowerCase() === 'active'
      && (!record.endDate || new Date(record.endDate).getTime() >= Date.now()));
    return {
      currentPlan: current?.displayName || current?.planName || current?.planType || null,
      status: current?.status || 'inactive',
      renewalDate: current?.endDate || null,
      amount: current ? Number(current.amount ?? current.monthlyFee) : null,
      plans: plans.map(plan => ({ ...plan, price: Number(plan.price), features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || [] })),
      requests: records.filter(record => record.status.toLowerCase() === 'pending'),
    };
  }

  async updateSubscription(ownerId: number, planData: { planId: number }) {
    const [plan] = await this.subscriptionRepo.query(
      'SELECT * FROM subscription_plans WHERE id = $1 AND "isActive" = true', [planData.planId],
    );
    if (!plan) throw new BadRequestException('Choose an available subscription plan');
    // The server uses the catalog price; the browser cannot choose a price or activate a plan.
    const pending = await this.subscriptionRepo.findOne({ where: { ownerId, planType: plan.name, status: 'pending' } });
    if (pending) throw new BadRequestException('This plan already has a pending request');
    const sub = this.subscriptionRepo.create({
      ownerId, planId: plan.id, planName: plan.displayName, planType: plan.name,
      amount: Number(plan.price), monthlyFee: 0, currency: plan.currency,
      status: 'pending', billingCycle: plan.name.toLowerCase(),
    });
    await this.subscriptionRepo.save(sub);
    return { status: 'pending', requestedPlan: plan.displayName, amount: Number(plan.price) };
  }
}
