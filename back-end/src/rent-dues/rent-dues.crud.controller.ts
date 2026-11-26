import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { DataSource, In, Repository } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, findOr404, ownerPropertyIds, writable } from '../common/crud';
import { RentDue } from './rent-due.entity';

/** Plain CRUD for rent dues. Workflow actions (pay, waive, run-check) stay in RentDuesController. */
@ApiTags('rent-dues')
@Controller('rent-dues')
@UseGuards(RolesGuard)
export class RentDuesCrudController {
  constructor(@InjectRepository(RentDue) private readonly repo: Repository<RentDue>, private readonly db: DataSource) {}

  @Get()
  @Roles('admin', 'warden', 'owner', 'tenant')
  async list(@Req() req: { user: AuthUser }, @Query('propertyId') propertyId?: string, @Query('tenantId') tenantId?: string) {
    const where: Record<string, unknown> = {};
    if (propertyId) where.propertyId = Number(propertyId);
    if (tenantId) where.tenantId = Number(tenantId);
    if (req.user.role === 'tenant') where.tenantId = req.user.id;
    if (req.user.role === 'owner') {
      const ids = await ownerPropertyIds(this.db, req.user.id);
      where.propertyId = propertyId && ids.includes(Number(propertyId)) ? Number(propertyId) : In(ids);
    }
    return this.repo.find({ where, order: { dueDate: 'DESC' } });
  }

  @Post()
  @Roles('admin', 'warden')
  create(@Body() body: Partial<RentDue>) {
    return this.repo.save(this.repo.create(writable(body, ['paymentId', 'paidAt'])));
  }

  @Patch(':id')
  @Roles('admin', 'warden')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: Partial<RentDue>) {
    const row = await findOr404(this.repo, id, 'Rent due');
    if (row.status === 'paid' && body.amount !== undefined) throw new ForbiddenException('A paid due cannot change amount');
    return this.repo.save(Object.assign(row, writable(body)));
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const row = await findOr404(this.repo, id, 'Rent due');
    await this.repo.remove(row);
    return { id };
  }
}
