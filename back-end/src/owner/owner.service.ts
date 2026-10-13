import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Property } from '../properties/property.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';

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
      const tRooms = p.totalRooms || 10;
      const oRooms = p.occupiedRooms || 0;
      const rent = p.monthlyRent || p.rentMin || 7000;

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

    const notifications = await this.notificationRepo.find({
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
      company: user.company || 'Iyer Properties Pvt Ltd',
      city: user.city || 'Chennai',
      state: user.state || 'Tamil Nadu',
      pincode: user.pincode || '600001',
      bio:
        user.bio ||
        'Experienced PG owner with 10+ years in the rental business.',
      avatar: user.avatar || null,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan || 'Premium',
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

  async getPolicy(ownerId: number) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }

    const defaultPolicy = {
      noticePeriod: 30,
      securityDeposit: 2,
      rentDueDay: 5,
      lateFee: 500,
      guestPolicy: 'allowed',
      guestHours: '09:00-21:00',
      smokingAllowed: false,
      petsAllowed: false,
      maintenanceWindow: '09:00-18:00',
      rentIncrease: 10,
      rentIncreaseFrequency: 'yearly',
      autoRenew: true,
      leaseTermMonths: 11,
    };

    return user.policy || defaultPolicy;
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

    const propertiesCount = await this.propertyRepo.count({
      where: { ownerId: ownerId },
    });

    return {
      currentPlan: user.subscriptionPlan || 'Growth',
      status: 'active',
      monthlyFee: user.subscriptionFee ? Number(user.subscriptionFee) : 8000,
      billingCycle: 'monthly',
      propertiesManaged: propertiesCount,
      maxProperties: 10,
      renewalDate: '2025-04-15',
      features: [
        'Up to 10 Properties',
        'Advanced Analytics',
        'Direct Messaging',
        'Automated Rent Reminders',
        'Priority Support',
      ],
    };
  }

  async updateSubscription(ownerId: number, planData: any) {
    const user = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('Owner not found');
    }

    if (planData.plan) {
      user.subscriptionPlan = planData.plan;
    }
    if (planData.fee !== undefined) {
      user.subscriptionFee = planData.fee;
    }

    await this.userRepo.save(user);
    return this.getSubscription(ownerId);
  }
}
