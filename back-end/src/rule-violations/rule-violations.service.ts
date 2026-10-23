import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleViolation } from './rule-violation.entity';
import { User } from '../users/user.entity';
import { Notification } from '../notifications/notification.entity';
import { Booking } from '../bookings/booking.entity';
import {
  CreateRuleViolationDto,
  UpdateRuleViolationDto,
} from './rule-violations.dto';

@Injectable()
export class RuleViolationsService {
  constructor(
    @InjectRepository(RuleViolation)
    private readonly repo: Repository<RuleViolation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  findAll() {
    return this.repo.find({
      relations: { tenant: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const violation = await this.repo.findOne({
      where: { id },
      relations: { tenant: true },
    });
    if (!violation) {
      throw new NotFoundException(`Rule violation with ID ${id} not found`);
    }
    return violation;
  }

  async create(dto: CreateRuleViolationDto) {
    // Verify that the tenant exists in the users table
    const tenantUser = await this.userRepo.findOne({
      where: { id: dto.tenantId },
    });

    if (!tenantUser) {
      throw new BadRequestException(
        `Cannot create violation: Tenant with user ID ${dto.tenantId} does not exist in the users table`,
      );
    }

    const tenantName = dto.tenantName || tenantUser.name;
    const reportedAt = dto.reportedAt || new Date().toISOString().split('T')[0];

    const violation = this.repo.create({
      ...dto,
      tenant: tenantUser,
      tenantId: tenantUser.id,
      tenantName,
      reportedAt,
      warningCount: dto.warningCount || 1,
      severity: dto.severity || 'low',
      status: 'active',
      escalatedToOwner: false,
    });

    return this.repo.save(violation);
  }

  async update(id: number, dto: UpdateRuleViolationDto) {
    const violation = await this.findOne(id);
    Object.assign(violation, dto);
    return this.repo.save(violation);
  }

  async issueWarning(id: number) {
    const violation = await this.findOne(id);
    violation.warningCount = (violation.warningCount || 0) + 1;
    violation.status = 'warned';
    const saved = await this.repo.save(violation);

    // Notify tenant ALONE (not owner)
    if (violation.tenantId) {
      await this.notifRepo.save({
        title: 'Warning Issued: Rule Violation',
        message: `A warning (#${violation.warningCount}) has been issued to you for: ${violation.type}. Please adhere to PG guidelines.`,
        type: 'warning',
        priority: violation.severity === 'high' ? 'high' : 'medium',
        userId: violation.tenantId,
        targetRole: 'tenant',
        sentAt: new Date().toISOString(),
      });
    }

    return saved;
  }

  async escalateToOwner(id: number) {
    const violation = await this.findOne(id);
    violation.escalatedToOwner = true;
    violation.status = 'escalated';
    const saved = await this.repo.save(violation);

    // Find owner of the property where the tenant resides
    let ownerId = 4;
    if (violation.tenantId) {
      const booking = await this.bookingRepo.findOne({
        where: { tenantId: violation.tenantId },
        relations: { property: true },
      });
      if (booking?.property?.ownerId) {
        ownerId = booking.property.ownerId;
      }
    }

    // 1. Send notification to Owner
    await this.notifRepo.save({
      title: 'Rule Violation Escalated',
      message: `Tenant ${violation.tenantName || 'Resident'} (Room ${violation.roomNumber || 'N/A'}) has been escalated to you for repeated rule violations: ${violation.type}.`,
      type: 'warning',
      priority: 'high',
      userId: ownerId,
      targetRole: 'owner',
      sentAt: new Date().toISOString(),
    });

    // 2. Send notification to Tenant
    if (violation.tenantId) {
      await this.notifRepo.save({
        title: 'Rule Violation Escalated to Owner',
        message: `Your rule violation regarding "${violation.type}" has been escalated to the Property Owner for review.`,
        type: 'warning',
        priority: 'high',
        userId: violation.tenantId,
        targetRole: 'tenant',
        sentAt: new Date().toISOString(),
      });
    }

    return saved;
  }

  async remove(id: number) {
    const violation = await this.findOne(id);
    await this.repo.remove(violation);
    return { success: true, id };
  }
}
