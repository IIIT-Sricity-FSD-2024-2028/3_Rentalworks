import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, findOr404, writable } from '../common/crud';
import { RoommateProfile } from './roommate-profile.entity';

/** CRUD for roommate-matching profiles. A guest/tenant may only change their own profile. */
@ApiTags('roommate-profiles')
@Controller('roommate-profiles')
@UseGuards(RolesGuard)
export class RoommateProfilesController {
  constructor(@InjectRepository(RoommateProfile) private readonly repo: Repository<RoommateProfile>) {}

  private assertOwn(user: AuthUser, row: RoommateProfile) {
    if (['guest', 'tenant'].includes(user.role) && row.userId !== user.id) {
      throw new ForbiddenException('You can only change your own profile');
    }
  }

  @Get()
  @Roles('admin', 'warden', 'guest', 'tenant')
  list(@Query('propertyId') propertyId?: string) {
    return this.repo.find({ where: propertyId ? { propertyId: Number(propertyId) } : {}, order: { id: 'DESC' } });
  }

  @Post()
  @Roles('admin', 'guest', 'tenant')
  create(@Req() req: { user: AuthUser }, @Body() body: Partial<RoommateProfile>) {
    const data = writable(body);
    if (req.user.role !== 'admin') data.userId = req.user.id;
    return this.repo.save(this.repo.create(data));
  }

  @Patch(':id')
  @Roles('admin', 'guest', 'tenant')
  async update(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number, @Body() body: Partial<RoommateProfile>) {
    const row = await findOr404(this.repo, id, 'Roommate profile');
    this.assertOwn(req.user, row);
    return this.repo.save(Object.assign(row, writable(body, ['userId'])));
  }

  @Delete(':id')
  @Roles('admin', 'guest', 'tenant')
  async remove(@Req() req: { user: AuthUser }, @Param('id', ParseIntPipe) id: number) {
    const row = await findOr404(this.repo, id, 'Roommate profile');
    this.assertOwn(req.user, row);
    await this.repo.remove(row);
    return { id };
  }
}
