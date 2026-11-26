import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './rooms.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser, assertOwnerProperty, ownerPropertyIds } from '../common/crud';
import { Room } from './room.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService, private readonly db: DataSource) {}

  /**
   * Owners manage the rooms of their own properties. Bed occupancy is set by
   * bookings / allotment, so an owner can never type it in.
   */
  private ownerBody(user: AuthUser, dto: Partial<CreateRoomDto>) {
    if (user.role === 'owner') delete dto.currentOccupancy;
    return dto;
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms (public catalogue)' })
  findAll(@Query('propertyId') propertyId?: string) {
    return this.roomsService.findAll().then((rooms) => (propertyId ? rooms.filter((r) => r.propertyId === Number(propertyId)) : rooms));
  }

  @Get('mine')
  @Roles('owner')
  @ApiOperation({ summary: "Rooms in the signed-in owner's properties" })
  async mine(@Req() req: { user: AuthUser }) {
    const ids = await ownerPropertyIds(this.db, req.user.id);
    return this.db.getRepository(Room).find({ where: { propertyId: In(ids) }, order: { propertyId: 'ASC', roomNumber: 'ASC' } });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by ID' })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(+id);
  }

  @Post()
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Create new room' })
  async create(@Req() req: { user: AuthUser }, @Body() createRoomDto: CreateRoomDto) {
    if (req.user.role === 'owner') {
      if (!createRoomDto.propertyId) throw new BadRequestException('Choose the property this room belongs to');
      await assertOwnerProperty(this.db, req.user, createRoomDto.propertyId);
    }
    return this.roomsService.create(this.ownerBody(req.user, createRoomDto) as CreateRoomDto);
  }

  @Put(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Update room (status, maintenance, occupancy)' })
  async update(@Req() req: { user: AuthUser }, @Param('id') id: string, @Body() updateRoomDto: UpdateRoomDto) {
    const room = await this.roomsService.findOne(+id);
    if (req.user.role === 'owner') {
      await assertOwnerProperty(this.db, req.user, room.propertyId);
      // A room cannot move to another owner's property.
      if (updateRoomDto.propertyId) await assertOwnerProperty(this.db, req.user, updateRoomDto.propertyId);
    }
    const capacity = updateRoomDto.capacity ?? room.capacity;
    if (capacity < (room.currentOccupancy || 0)) {
      throw new BadRequestException(`Room ${room.roomNumber} has ${room.currentOccupancy} tenants; capacity cannot be lower`);
    }
    return this.roomsService.update(+id, this.ownerBody(req.user, updateRoomDto));
  }

  @Delete(':id')
  @Roles('admin', 'warden', 'owner')
  @ApiOperation({ summary: 'Delete room' })
  async remove(@Req() req: { user: AuthUser }, @Param('id') id: string) {
    const room = await this.roomsService.findOne(+id);
    if (req.user.role === 'owner') await assertOwnerProperty(this.db, req.user, room.propertyId);
    if ((room.currentOccupancy || 0) > 0) {
      throw new BadRequestException(`Room ${room.roomNumber} still has tenants; move them before deleting it`);
    }
    return this.roomsService.remove(+id);
  }
}
