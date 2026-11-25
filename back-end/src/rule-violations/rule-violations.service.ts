import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuleViolation } from './rule-violation.entity';
import { User } from '../users/user.entity';
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
    return this.repo.save(violation);
  }

  async escalateToOwner(id: number) {
    const violation = await this.findOne(id);
    violation.escalatedToOwner = true;
    violation.status = 'escalated';
    return this.repo.save(violation);
  }

  async remove(id: number) {
    const violation = await this.findOne(id);
    await this.repo.remove(violation);
    return { success: true, id };
  }
}
