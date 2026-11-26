import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { DataSource, In, Repository } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, findOr404, ownerPropertyIds, writable } from '../common/crud';
import { AuditLog } from './audit-log.entity';

/**
 * CRUD for the audit trail. Actor fields always come from the signed-in user.
 * Editing or deleting history is limited to admins.
 */
@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(RolesGuard)
export class AuditLogsController {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>, private readonly db: DataSource) {}

  @Get()
  @Roles('admin', 'warden', 'owner')
  async list(@Req() req: { user: AuthUser }, @Query('propertyId') propertyId?: string, @Query('tenantId') tenantId?: string) {
    const where: Record<string, unknown> = {};
    if (propertyId) where.propertyId = Number(propertyId);
    if (tenantId) where.tenantId = Number(tenantId);
    if (req.user.role === 'owner') where.propertyId = In(await ownerPropertyIds(this.db, req.user.id));
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 500 });
  }

  @Post()
  @Roles('admin', 'warden')
  create(@Req() req: { user: AuthUser & { name?: string } }, @Body() body: Partial<AuditLog>) {
    const data = writable(body, ['actorId', 'actorRole', 'actorName']);
    return this.repo.save(this.repo.create({ ...data, actorId: req.user.id, actorRole: req.user.role, actorName: req.user.name || '' }));
  }

  @Patch(':id')
  @Roles('admin')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<AuditLog>) {
    const row = await findOr404(this.repo, id, 'Audit log');
    return this.repo.save(Object.assign(row, writable(body, ['actorId', 'actorRole', 'actorName'])));
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const row = await findOr404(this.repo, id, 'Audit log');
    await this.repo.remove(row);
    return { id };
  }
}
