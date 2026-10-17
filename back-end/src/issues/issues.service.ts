import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue, IssueStatus } from './issue.entity';
import { CreateIssueDto, UpdateIssueDto } from './issues.dto';
import { Notification } from '../notifications/notification.entity';
import { Property } from '../properties/property.entity';

@Injectable()
export class IssuesService {
  constructor(
    @InjectRepository(Issue)
    private readonly issuesRepository: Repository<Issue>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  async create(createDto: CreateIssueDto, tenantId: number): Promise<Issue> {
    const finalTenantId = tenantId || createDto.tenantId;
    if (!finalTenantId) {
      throw new ForbiddenException('Tenant ID is required to create an issue.');
    }

    const issue = this.issuesRepository.create({
      ...createDto,
      tenantId: finalTenantId,
      status: createDto.status || IssueStatus.OPEN,
    });

    const savedIssue = await this.issuesRepository.save(issue);

    // Automatically create notification for tenant dashboard activity
    try {
      const notif = this.notificationsRepository.create({
        title: 'Issue Created',
        message: `Your issue "${savedIssue.title}" has been registered successfully.`,
        type: 'issue',
        priority: savedIssue.priority || 'medium',
        recipients: 1,
        userId: finalTenantId,
        isRead: false,
        sentAt: new Date().toISOString(),
      });
      await this.notificationsRepository.save(notif);
      if (savedIssue.propertyId) {
        const property = await this.issuesRepository.manager.getRepository(Property).findOneBy({ id: savedIssue.propertyId });
        if (property) await this.notificationsRepository.save(this.notificationsRepository.create({
          title: 'New property issue', message: savedIssue.title, type: 'issue', priority: savedIssue.priority,
          userId: property.ownerId, byUserId: finalTenantId, sentAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      // Non-critical background notification log
    }

    return savedIssue;
  }

  async findMy(tenantId: number): Promise<Issue[]> {
    return this.issuesRepository.find({
      where: { tenantId },
      relations: { property: true, roomEntity: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(propertyId?: number, status?: string): Promise<Issue[]> {
    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;

    return this.issuesRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number, currentUserId?: number, role?: string): Promise<Issue> {
    const issue = await this.issuesRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true },
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }

    if (role === 'tenant' && currentUserId && issue.tenantId !== currentUserId) {
      throw new ForbiddenException('You can only view your own reported issues.');
    }

    return issue;
  }

  async update(
    id: number,
    updateDto: UpdateIssueDto,
    currentUserId?: number,
    role?: string,
  ): Promise<Issue> {
    const issue = await this.findOne(id, currentUserId, role);

    const oldStatus = issue.status;

    if (updateDto.status && updateDto.status === IssueStatus.RESOLVED && !issue.resolvedAt) {
      updateDto.resolvedAt = new Date();
    }

    Object.assign(issue, updateDto);
    const updated = await this.issuesRepository.save(issue);

    // If status changed, create notification
    if (updateDto.status && updateDto.status !== oldStatus) {
      try {
        const notif = this.notificationsRepository.create({
          title: 'Issue Status Updated',
          message: `Your issue "${issue.title}" status has changed to ${issue.status}.`,
          type: 'issue_status',
          priority: issue.priority || 'medium',
          recipients: 1,
          userId: issue.tenantId,
          isRead: false,
          sentAt: new Date().toISOString(),
        });
        await this.notificationsRepository.save(notif);
      } catch (err) {
        // Non-critical
      }
    }

    return updated;
  }

  async remove(id: number, currentUserId?: number, role?: string): Promise<Issue> {
    const issue = await this.findOne(id, currentUserId, role);
    const clone = { ...issue };
    await this.issuesRepository.remove(issue);
    return clone;
  }
}
