import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto, UpdateRoomDto } from './rooms.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private roomsRepository: Repository<Room>,
  ) {}

  async findAll(): Promise<Room[]> {
    return this.roomsRepository.find({
      relations: { property: true },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: { property: true },
    });
    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }
    return room;
  }

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const propertyId = createRoomDto.propertyId || 1;
    const existing = await this.roomsRepository.findOne({
      where: {
        roomNumber: createRoomDto.roomNumber.trim(),
        propertyId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Room ${createRoomDto.roomNumber} already exists in property ${propertyId}`,
      );
    }

    const capacity = createRoomDto.capacity || 2;
    const currentOccupancy = createRoomDto.currentOccupancy || 0;
    const status =
      createRoomDto.status ||
      (currentOccupancy >= capacity ? 'full' : 'available');
    const maintenanceStatus = createRoomDto.maintenanceStatus || 'Ready';
    const rent = createRoomDto.rent !== undefined ? createRoomDto.rent : 8000;

    const newRoom = this.roomsRepository.create({
      roomNumber: createRoomDto.roomNumber.trim(),
      propertyId,
      capacity,
      currentOccupancy,
      rent,
      status,
      maintenanceStatus,
    });

    return this.roomsRepository.save(newRoom);
  }

  async update(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);

    const cleanDto = Object.fromEntries(
      Object.entries(updateRoomDto).filter(([_, v]) => v !== undefined),
    );

    if (cleanDto.roomNumber) {
      cleanDto.roomNumber = (cleanDto.roomNumber as string).trim();
    }

    Object.assign(room, cleanDto);

    // Synchronize occupancy status if currentOccupancy or capacity changed without explicit status override
    if (updateRoomDto.status === undefined) {
      if (room.currentOccupancy >= room.capacity && room.capacity > 0) {
        room.status = 'full';
      } else {
        room.status = 'available';
      }
    }

    return this.roomsRepository.save(room);
  }

  async remove(id: number): Promise<Room> {
    const room = await this.findOne(id);
    const removed = { ...room };
    await this.roomsRepository.remove(room);
    return removed as Room;
  }
}
