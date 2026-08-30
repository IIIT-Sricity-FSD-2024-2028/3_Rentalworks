import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserActivity } from './user-activity.entity';
import { CreateUserDto, UpdateUserDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './users.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private activityRepository: Repository<UserActivity>,
    private subscriptionsService: SubscriptionsService,
  ) {}

  findAll() {
    return this.usersRepository.find();
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    
    if (user.role === 'owner') {
      const subInfo = await this.subscriptionsService.getCurrentSubscription(user.id);
      return {
        ...user,
        subscriptionStatus: subInfo.status,
        hasActiveSubscription: subInfo.isActive,
        activeSubscription: subInfo.subscription,
        subscriptionPlan: subInfo.plan ? subInfo.plan.displayName : user.subscriptionPlan
      };
    }
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password || 'default123', 10);
    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    });
    return this.usersRepository.save(newUser);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    
    // Filter out undefined values to prevent overwriting
    const cleanDto = Object.fromEntries(Object.entries(updateUserDto).filter(([_, v]) => v !== undefined));
    
    if (cleanDto.password) {
      cleanDto.password = await bcrypt.hash(cleanDto.password as string, 10);
    }

    Object.assign(user, cleanDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    const removed = { ...user };
    await this.usersRepository.remove(user);
    return removed;
  }

  async login(loginDto: LoginDto, clientMetadata: any = {}) {
    const user = await this.usersRepository.findOne({
      where: [
        { username: loginDto.username },
        { email: loginDto.username }
      ]
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const isMatch = await bcrypt.compare(loginDto.password || '', user.password || '');
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    
    user.lastLoginAt = new Date();
    await this.usersRepository.save(user);

    await this.logActivity(user.id, 'login', 'Successfully logged in', clientMetadata);

    const { password, ...result } = user;

    // Attach real-time subscription details for owner
    if (user.role === 'owner') {
      const subInfo = await this.subscriptionsService.getCurrentSubscription(user.id);
      return {
        ...result,
        subscriptionStatus: subInfo.status,
        hasActiveSubscription: subInfo.isActive,
        subscriptionPlan: subInfo.plan ? subInfo.plan.displayName : (user.subscriptionPlan || 'None'),
        subscriptionFee: subInfo.subscription ? subInfo.subscription.amount : (user.subscriptionFee || 0),
        subscriptionEndDate: subInfo.subscription ? subInfo.subscription.endDate : null,
        activeSubscription: subInfo.subscription
      };
    }

    return result;
  }

  async logActivity(userId: number, type: 'login' | 'account_action', description: string, metadata?: any) {
    const activity = this.activityRepository.create({
      userId,
      type,
      description,
      metadata,
    });
    await this.activityRepository.save(activity);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersRepository.findOneBy({ email: forgotPasswordDto.email });
    if (!user) {
      // Return fake success to prevent email enumeration
      return { message: 'If an account exists, a reset link was sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await this.usersRepository.save(user);

    console.log(`[DEBUG] Password reset token for ${user.email}: ${resetToken}`);
    return { message: 'If an account exists, a reset link was sent.', devToken: resetToken };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;
    const user = await this.usersRepository.findOneBy({ resetToken: token });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    user.sessionValidSince = new Date(); // Automatically invalidate old sessions on password reset
    await this.usersRepository.save(user);
    
    await this.logActivity(user.id, 'account_action', 'Password reset successfully');
    return { message: 'Password reset successfully' };
  }

  async logoutAll(userId: number) {
    const user = await this.findOne(userId);
    user.sessionValidSince = new Date();
    await this.usersRepository.save(user);
    await this.logActivity(user.id, 'account_action', 'Signed out from all devices');
    return { message: 'Signed out from all devices successfully' };
  }

  async getUserActivity(userId: number) {
    return this.activityRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20
    });
  }
}
