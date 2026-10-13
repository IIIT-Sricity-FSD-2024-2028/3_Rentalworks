import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Payment } from '../payments/payment.entity';
import { Booking } from '../bookings/booking.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Notification } from '../notifications/notification.entity';
import { ChangePasswordDto, CreateAnnouncementDto, CreateRegionalAdminDto, UpdateProfileDto, UpdateRegionalAdminDto } from './super-admin.dto';
import { newTotpSecret, verifyTotp } from './totp';

@Injectable()
export class SuperAdminService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Property) private properties: Repository<Property>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(Booking) private bookings: Repository<Booking>,
    @InjectRepository(TenantStay) private stays: Repository<TenantStay>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => { void this.dueAnnouncements().catch(error => console.error('Scheduled announcements:', error)); }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async overview() {
    const users = await this.users.find({ order: { id: 'ASC' } });
    const properties = await this.properties.find({ relations: { owner: true }, order: { id: 'ASC' } });
    const payments = await this.payments.find({ order: { id: 'ASC' } });
    const notifications = await this.notifications.find({ where: { byUser: { role: 'super_admin' } }, relations: { byUser: true }, order: { id: 'DESC' } });
    const activeBookings = await this.bookings.find({ where: { status: 'active' } });
    const activeStays = await this.stays.find({ where: { status: 'active' } });
    const userProperties: Record<number, number[]> = {};
    for (const record of activeBookings) {
      if (!userProperties[record.tenantId]) userProperties[record.tenantId] = [];
      if (!userProperties[record.tenantId].includes(record.propertyId)) userProperties[record.tenantId].push(record.propertyId);
    }
    for (const record of activeStays) {
      if (!userProperties[record.tenantId]) userProperties[record.tenantId] = [];
      if (!userProperties[record.tenantId].includes(record.propertyId)) userProperties[record.tenantId].push(record.propertyId);
    }
    for (const user of users) {
      if (user.role !== 'warden' || !user.region) continue;
      userProperties[user.id] = properties.filter(property => property.location.trim().toLowerCase() === user.region?.trim().toLowerCase()).map(property => property.id);
    }
    const safeUsers = users.map(user => ({
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      role: user.role, status: user.status, region: user.region,
      subscriptionPlan: user.subscriptionPlan, subscriptionFee: user.subscriptionFee,
      propertyIds: userProperties[user.id] || [], createdAt: user.createdAt,
    }));
    return { users: safeUsers, properties, payments, notifications };
  }

  async createAdmin(dto: CreateRegionalAdminDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.exists({ where: { email } })) throw new ConflictException('Email is already in use');
    const username = email;
    const admin = this.users.create({
      name: dto.name.trim(), email, phone: dto.phone.trim(), region: dto.region.trim(),
      username, password: await bcrypt.hash(dto.password, 10), role: 'admin', status: 'active',
    });
    const saved = await this.users.save(admin);
    return { id: saved.id, name: saved.name, email: saved.email, phone: saved.phone, region: saved.region, role: saved.role, status: saved.status, username: saved.username };
  }

  async updateAdmin(id: number, dto: UpdateRegionalAdminDto) {
    const admin = await this.users.findOneBy({ id, role: 'admin' });
    if (!admin) throw new NotFoundException('Regional admin not found');
    admin.region = dto.region.trim();
    await this.users.save(admin);
    return { id: admin.id, region: admin.region };
  }

  async profile(id: number) {
    const user = await this.users.findOneBy({ id, role: 'super_admin' });
    if (!user) throw new NotFoundException('Super admin not found');
    return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, twoFactorEnabled: user.twoFactorEnabled };
  }

  async updateProfile(id: number, dto: UpdateProfileDto) {
    const user = await this.users.findOneBy({ id, role: 'super_admin' });
    if (!user) throw new NotFoundException('Super admin not found');
    const email = dto.email.trim().toLowerCase();
    const duplicate = await this.users.findOneBy({ email });
    if (duplicate && duplicate.id !== id) throw new ConflictException('Email is already in use');
    user.name = dto.name.trim();
    user.email = email;
    user.phone = dto.phone.trim();
    await this.users.save(user);
    return this.profile(id);
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.password').where('user.id = :id AND user.role = :role', { id, role: 'super_admin' }).getOne();
    if (!user || !await bcrypt.compare(dto.currentPassword, user.password || '')) throw new UnauthorizedException('Current password is incorrect');
    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(user);
    return { message: 'Password changed' };
  }

  async startTwoFactor(id: number) {
    const user = await this.users.findOneBy({ id, role: 'super_admin' });
    if (!user) throw new NotFoundException('Super admin not found');
    if (user.twoFactorEnabled) throw new BadRequestException('Two-factor authentication is already enabled');
    const secret = newTotpSecret();
    await this.users.update(id, { twoFactorSecret: secret });
    return { secret, account: user.email, issuer: 'RentBro' };
  }

  async confirmTwoFactor(id: number, code: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.twoFactorSecret')
      .where('user.id = :id AND user.role = :role', { id, role: 'super_admin' }).getOne();
    if (!user?.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) throw new BadRequestException('Invalid authenticator code');
    user.twoFactorEnabled = true;
    await this.users.save(user);
    return { twoFactorEnabled: true };
  }

  async disableTwoFactor(id: number, code: string) {
    const user = await this.users.createQueryBuilder('user').addSelect('user.twoFactorSecret')
      .where('user.id = :id AND user.role = :role', { id, role: 'super_admin' }).getOne();
    if (!user?.twoFactorEnabled || !user.twoFactorSecret || !verifyTotp(user.twoFactorSecret, code)) throw new BadRequestException('Invalid authenticator code');
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null as any;
    await this.users.save(user);
    return { twoFactorEnabled: false };
  }

  async announce(senderId: number, dto: CreateAnnouncementDto) {
    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    if (scheduledFor && (!Number.isFinite(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now())) {
      throw new BadRequestException('Choose a future schedule time');
    }
    if (dto.targetPropertyId && dto.targetRole !== 'tenant' && dto.targetRole !== 'warden') throw new BadRequestException('Property targeting requires tenants or wardens');
    if (dto.targetUserId && !dto.targetPropertyId) throw new BadRequestException('Select a property before selecting a user');
    if (dto.targetPropertyId && !await this.properties.existsBy({ id: dto.targetPropertyId })) throw new NotFoundException('Property not found');

    let candidates = await this.users.find({ where: { status: 'active' } });
    if (dto.targetRole !== 'all') candidates = candidates.filter(user => user.role === dto.targetRole);
    if (dto.targetPropertyId) {
      if (dto.targetRole === 'warden') {
        const property = await this.properties.findOneByOrFail({ id: dto.targetPropertyId });
        candidates = candidates.filter(user => user.region?.trim().toLowerCase() === property.location.trim().toLowerCase());
      } else {
        const bookings = await this.bookings.find({ where: { propertyId: dto.targetPropertyId, status: 'active' } });
        const stays = await this.stays.find({ where: { propertyId: dto.targetPropertyId, status: 'active' } });
        const ids = new Set<number>();
        for (const booking of bookings) ids.add(booking.tenantId);
        for (const stay of stays) ids.add(stay.tenantId);
        candidates = candidates.filter(user => ids.has(user.id));
      }
    }
    if (dto.targetUserId) candidates = candidates.filter(user => user.id === dto.targetUserId);
    if (!candidates.length) throw new BadRequestException('No active users match this audience');
    const notification = this.notifications.create({
      title: dto.title.trim(), message: dto.message.trim(), type: dto.type,
      priority: dto.priority, recipients: candidates.length,
      recipientUserIds: candidates.map(user => user.id), targetRole: dto.targetRole,
      targetPropertyId: dto.targetPropertyId, byUserId: senderId,
      sentAt: scheduledFor ? scheduledFor.toISOString() : new Date().toISOString(),
      deliveryStatus: scheduledFor ? 'scheduled' : 'sent',
    });
    return this.notifications.save(notification);
  }

  async dueAnnouncements() {
    const due = await this.notifications.createQueryBuilder('notification')
      .where('notification.deliveryStatus = :status', { status: 'scheduled' })
      .andWhere('notification.sentAt <= :now', { now: new Date().toISOString() }).getMany();
    for (const notification of due) {
      notification.deliveryStatus = 'sent';
      await this.notifications.save(notification);
    }
  }
}
