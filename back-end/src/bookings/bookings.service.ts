import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Booking } from './booking.entity';
import { CreateBookingDto, UpdateBookingDto, CheckoutBookingDto } from './bookings.dto';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { Room } from '../rooms/room.entity';
import { Property } from '../properties/property.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { WardenNotification } from '../warden-notifications/warden-notification.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private dataSource: DataSource,
  ) { }

  findAll(tenantId?: number, propertyId?: number) {
    const where: any = {};
    if (tenantId && !isNaN(tenantId) && Number.isInteger(tenantId) && tenantId > 0 && tenantId <= 2147483647) {
      where.tenantId = tenantId;
    }
    if (propertyId && !isNaN(propertyId) && Number.isInteger(propertyId) && propertyId > 0 && propertyId <= 2147483647) {
      where.propertyId = propertyId;
    }

    return this.bookingsRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true },
    });
  }

  async findOne(id: number) {
    if (!id || isNaN(id) || !Number.isInteger(id) || id <= 0 || id > 2147483647) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    const booking = await this.bookingsRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true },
    });
    if (!booking)
      throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  async create(createBookingDto: CreateBookingDto) {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: createBookingDto.tenantId } });
    if (user && ['admin', 'owner', 'warden', 'super_admin'].includes(user.role)) {
      throw new ForbiddenException('Unauthorized account: Management accounts cannot make tenant bookings.');
    }
    const property = await this.dataSource.getRepository(Property).findOne({ where: { id: createBookingDto.propertyId } });
    if (property && user) {
      const userGender = (user.gender || '').trim().toLowerCase();
      const policy = (property.gender || 'unisex').trim().toLowerCase();
      if (policy.includes('girl') || policy === 'female') {
        if (userGender !== 'female') {
          throw new BadRequestException(`Booking Ineligible: ${property.name} has a Girls Only policy. Ineligible booking rejected.`);
        }
      } else if (policy.includes('boy') || policy === 'male') {
        if (userGender !== 'male') {
          throw new BadRequestException(`Booking Ineligible: ${property.name} has a Boys Only policy. Ineligible booking rejected.`);
        }
      }
    }
    const { phone, ...bookingData } = createBookingDto;
    const newBooking = this.bookingsRepository.create({
      ...bookingData,
      status: 'pending',
    });
    return this.bookingsRepository.save(newBooking);
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    const booking = await this.findOne(id);
    const cleanDto = Object.fromEntries(
      Object.entries(updateBookingDto).filter(([_, v]) => v !== undefined),
    );
    Object.assign(booking, cleanDto);
    return this.bookingsRepository.save(booking);
  }

  async remove(id: number) {
    const booking = await this.findOne(id);
    const removed = { ...booking };
    await this.bookingsRepository.remove(booking);
    return removed;
  }

  async completeCheckout(dto: CheckoutBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const roomRepo = manager.getRepository(Room);
      const bookingRepo = manager.getRepository(Booking);
      const paymentRepo = manager.getRepository(Payment);
      const stayRepo = manager.getRepository(TenantStay);
      const propertyRepo = manager.getRepository(Property);
      const wardenNotifRepo = manager.getRepository(WardenNotification);

      // 1. Resolve Property FIRST for policy verification
      let property: Property | null = null;
      if (dto.propertyId) {
        property = await propertyRepo.findOne({ where: { id: dto.propertyId } });
      }
      if (!property && dto.propertyName) {
        property = await propertyRepo.findOne({ where: { name: dto.propertyName.trim() } });
      }
      if (!property) {
        // Fallback to first available approved property
        property = (await propertyRepo.findOne({ where: { status: 'approved' }, order: { id: 'ASC' } }))
          || (await propertyRepo.findOne({ where: { id: 1 } }));
      }
      const propId = property ? property.id : 1;
      const propName = property ? property.name : (dto.propertyName || 'Sunrise PG Residency');

      // 2. Resolve or Create User (Promoted to Tenant)
      let user: User | null = null;
      if (dto.guestId) {
        user = await userRepo.findOne({ where: { id: dto.guestId } });
      }
      if (!user && dto.email) {
        user = await userRepo.findOne({ where: { email: dto.email.trim() } });
      }

      // Check role restriction: prevent management accounts from making bookings
      if (user && ['admin', 'owner', 'warden', 'super_admin'].includes(user.role)) {
        throw new ForbiddenException(
          `Unauthorized account: ${user.role.toUpperCase()} accounts cannot make tenant PG bookings. Please use a Guest or Tenant account.`
        );
      }

      // 3. Gender Policy Verification
      const rawGender = (dto.gender || user?.gender || '').trim().toLowerCase();
      if (!rawGender) {
        throw new BadRequestException('Tenant gender is required to verify booking eligibility. Please select your gender.');
      }
      const normalizedGender = (rawGender === 'female' || rawGender === 'girl' || rawGender === 'women' || rawGender === 'f')
        ? 'female'
        : (rawGender === 'male' || rawGender === 'boy' || rawGender === 'men' || rawGender === 'm')
        ? 'male'
        : 'other';

      const propertyPolicy = (property?.gender || 'unisex').trim().toLowerCase();
      const isGirlsOnly = propertyPolicy.includes('girl') || propertyPolicy === 'female';
      const isBoysOnly = propertyPolicy.includes('boy') || propertyPolicy === 'male';

      if (isGirlsOnly && normalizedGender !== 'female') {
        throw new BadRequestException(
          `Ineligible Booking: "${propName}" is designated as Girls Only. Male tenants are not eligible to book this PG.`
        );
      }
      if (isBoysOnly && normalizedGender !== 'male') {
        throw new BadRequestException(
          `Ineligible Booking: "${propName}" is designated as Boys Only. Female tenants are not eligible to book this PG.`
        );
      }

      const rawPassword = dto.password?.trim() || 'tenant123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const timestamp = Date.now();
      const sanitizedName = (dto.name || 'tenant')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (user) {
        // Upgrade existing user (e.g. guest) to active tenant
        user.role = 'tenant';
        user.status = 'active';
        user.name = dto.name.trim() || user.name;
        user.phone = dto.phone.trim() || user.phone;
        user.gender = normalizedGender;
        user.password = passwordHash;
        user.joinDate = dto.checkIn || user.joinDate || new Date().toISOString().split('T')[0];
        await userRepo.save(user);
      } else {
        // Create new user directly as active tenant
        const username = `tenant_${sanitizedName}_${timestamp.toString().slice(-4)}`;
        user = userRepo.create({
          name: dto.name.trim(),
          email: dto.email.trim(),
          phone: dto.phone.trim(),
          role: 'tenant',
          gender: normalizedGender,
          username,
          password: passwordHash,
          status: 'active',
          joinDate: dto.checkIn || new Date().toISOString().split('T')[0],
        });
        user = await userRepo.save(user);
      }

      // 3. Resolve or Allocate Room
      const isSingleRoom =
        dto.roomType?.toLowerCase().includes('single') ||
        dto.roomType?.toLowerCase().includes('private');

      let roomNum = dto.roomNumber?.trim();
      let room: Room | null = null;

      if (isSingleRoom) {
        // STRICT SINGLE ROOM: Capacity must be 1, never assign to a shared room, no roommate allowed
        if (roomNum) {
          const candidate = await roomRepo.findOne({
            where: { roomNumber: roomNum, propertyId: propId },
          });
          if (
            candidate &&
            candidate.capacity === 1 &&
            (candidate.currentOccupancy || 0) < 1 &&
            candidate.status !== 'full'
          ) {
            room = candidate;
          }
        }

        // If not found or requested room was not a vacant single room, find first available single room
        if (!room) {
          const singleRooms = await roomRepo.find({
            where: { propertyId: propId, capacity: 1 },
            order: { id: 'ASC' },
          });
          room =
            singleRooms.find(
              (r) => (r.currentOccupancy || 0) < 1 && r.status !== 'full',
            ) || null;
        }

        if (room) {
          room.currentOccupancy = 1;
          room.status = 'full';
          await roomRepo.save(room);
          roomNum = room.roomNumber;
        } else {
          // Provision a new dedicated single room if all existing single rooms are occupied
          const newRoomNumber = `S-${Math.floor(Math.random() * 800) + 104}`;
          room = roomRepo.create({
            roomNumber: newRoomNumber,
            propertyId: propId,
            capacity: 1,
            currentOccupancy: 1,
            rent: dto.rent || 16000,
            status: 'full',
            maintenanceStatus: 'Ready',
          });
          room = await roomRepo.save(room);
          roomNum = newRoomNumber;
        }
      } else {
        // SHARED ROOM (Double / Triple Sharing)
        if (roomNum) {
          room = await roomRepo.findOne({
            where: { roomNumber: roomNum, propertyId: propId },
          });
        }

        if (!room) {
          const availableRooms = await roomRepo.find({
            where: { propertyId: propId },
            order: { id: 'ASC' },
          });
          room =
            availableRooms.find(
              (r) =>
                (r.capacity || 2) > 1 &&
                (r.currentOccupancy || 0) < (r.capacity || 2) &&
                r.status !== 'full',
            ) || null;
        }

        if (room) {
          room.currentOccupancy = (room.currentOccupancy || 0) + 1;
          if (room.currentOccupancy >= room.capacity) {
            room.status = 'full';
          }
          await roomRepo.save(room);
          roomNum = room.roomNumber;
        } else {
          const capacity = dto.roomType?.toLowerCase().includes('triple') ? 3 : 2;
          const newRoomNumber = roomNum || `R-${Math.floor(Math.random() * 800) + 101}`;
          room = roomRepo.create({
            roomNumber: newRoomNumber,
            propertyId: propId,
            capacity,
            currentOccupancy: 1,
            rent: dto.rent || 8500,
            status: 'available',
            maintenanceStatus: 'Ready',
          });
          room = await roomRepo.save(room);
          roomNum = newRoomNumber;
        }
      }

      // 4. Create Confirmed Booking Record
      const newBooking = bookingRepo.create({
        tenantId: user.id,
        propertyId: propId,
        roomId: room?.id,
        room: roomNum,
        checkIn: dto.checkIn || new Date().toISOString().split('T')[0],
        duration: dto.duration || '6 Months',
        rent: dto.rent || 8500,
        status: 'confirmed',
      });
      const savedBooking = await bookingRepo.save(newBooking);

      // 5. Create Payment Record (Verified / Cleared)
      const txnId = dto.transactionId || `TXN-${timestamp.toString().slice(-6)}`;
      const newPayment = paymentRepo.create({
        tenantId: user.id,
        propertyId: propId,
        room: roomNum,
        amount: dto.totalAmount || (Number(dto.rent) + Number(dto.deposit || 3500) + 500),
        method: dto.paymentMethod || 'UPI',
        transactionId: txnId,
        paidDate: new Date().toISOString().split('T')[0],
        status: 'verified',
        clearance: 'Cleared',
        platformFee: 500,
      });
      const savedPayment = await paymentRepo.save(newPayment);

      // 6. Create Active Tenant Stay
      const newStay = stayRepo.create({
        tenantId: user.id,
        propertyId: propId,
        roomId: room?.id,
        moveInDate: dto.checkIn || new Date().toISOString().split('T')[0],
        status: 'active',
      });
      await stayRepo.save(newStay);

      // 7. Route Automated Notification to Warden
      const wardenNotification = wardenNotifRepo.create({
        title: 'New Tenant Booking Confirmed',
        message: `${user.name} has completed payment (₹${Number(newPayment.amount).toLocaleString()}) and booked ${dto.roomType || 'Room'} (Room #${roomNum}) at ${propName}.`,
        type: 'check',
        priority: 'high',
        read: false,
        senderName: user.name,
        senderRole: 'tenant',
        propertyName: propName,
        roomNumber: roomNum,
        tenantId: user.id,
        propertyId: propId,
        sourceReferenceId: savedBooking.id,
      });
      await wardenNotifRepo.save(wardenNotification);

      return {
        success: true,
        message: 'Booking confirmed and tenant account created successfully in Neon database',
        tenant: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          username: user.username,
          role: user.role,
          status: user.status,
          room: roomNum,
        },
        credentials: {
          username: user.username,
          email: user.email,
          password: rawPassword,
        },
        booking: {
          id: savedBooking.id,
          bookingCode: `BK-${savedBooking.id.toString().padStart(5, '0')}`,
          room: roomNum,
          roomType: dto.roomType,
          checkIn: savedBooking.checkIn,
          duration: savedBooking.duration,
          rent: Number(savedBooking.rent),
          status: savedBooking.status,
          property: propName,
        },
        payment: {
          id: savedPayment.id,
          transactionId: txnId,
          amount: Number(savedPayment.amount),
          method: savedPayment.method,
          status: savedPayment.status,
          paidDate: savedPayment.paidDate,
        },
      };
    });
  }
}
