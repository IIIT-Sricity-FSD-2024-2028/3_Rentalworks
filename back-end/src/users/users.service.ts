import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './user.entity';
import { Booking } from '../bookings/booking.entity';
import { Room } from '../rooms/room.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { Payment } from '../payments/payment.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  CreateTenantDto,
  UpdateTenantDto,
} from './users.dto';
import * as bcrypt from 'bcrypt';
import { issueSuperAdminToken } from '../super-admin/super-admin-token';
import { verifyTotp } from '../super-admin/totp';
import { ensureSharedColumns } from '../migrations/ensure-shared-columns';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  findAll() {
    return this.usersRepository.find();
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    if (createUserDto.role === 'super_admin') throw new ForbiddenException('Super admin accounts cannot be created here');
    const hashedPassword = await bcrypt.hash(
      createUserDto.password || 'default123',
      10,
    );
    const defaults = {
      password: hashedPassword,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    };
    const payload = Object.assign({}, defaults, createUserDto);
    payload.password = hashedPassword;
    const newUser = this.usersRepository.create(payload);
    return this.usersRepository.save(newUser);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    if (user.role === 'super_admin' || updateUserDto.role === 'super_admin') {
      throw new ForbiddenException('Use the super admin account endpoints');
    }

    // Filter out undefined values to prevent overwriting
    const cleanDto = Object.fromEntries(
      Object.entries(updateUserDto).filter(([_, v]) => v !== undefined),
    );

    if (cleanDto.password) {
      cleanDto.password = await bcrypt.hash(cleanDto.password as string, 10);
    }

    Object.assign(user, cleanDto);
    const updated = await this.usersRepository.save(user);
    const { password, ...result } = updated;
    return result;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (user.role === 'super_admin') throw new ForbiddenException('Super admin accounts cannot be deleted here');
    const removed = Object.assign({}, user);
    await this.usersRepository.remove(user);
    return removed;
  }

  async login(loginDto: LoginDto) {
    await ensureSharedColumns(this.dataSource);
    const identifier = (loginDto.username || '').trim();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.username = :identifier OR user.email = :identifier OR user.phone = :identifier', { identifier })
      .addSelect('user.password')
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(
      loginDto.password || '',
      user.password || '',
    );
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (user.role === 'super_admin' && user.twoFactorEnabled) {
      const withSecret = await this.usersRepository.createQueryBuilder('user')
        .addSelect('user.twoFactorSecret').where('user.id = :id', { id: user.id }).getOne();
      if (!withSecret?.twoFactorSecret || !verifyTotp(withSecret.twoFactorSecret, loginDto.otp || '')) {
        throw new UnauthorizedException('Enter the current authenticator code');
      }
    }

    const result = Object.assign({}, user);
    delete (result as any).password;
    if (user.role === 'super_admin' && user.status === 'active') {
      return Object.assign(result, { token: issueSuperAdminToken(user.id) });
    }
    return result;
  }

  async guestLogin(loginDto: LoginDto) {
    const user = await this.login(loginDto);
    const unauthorizedRoles = ['admin', 'owner', 'warden', 'super_admin'];
    if (unauthorizedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Unauthorized account: ${user.role.toUpperCase()} accounts cannot access the guest booking flow. Please sign in with a Guest or Tenant account, or visit the main Portal Login for dashboard access.`
      );
    }
    return user;
  }

  async guestRegister(dto: { name: string; email: string; phone: string; password?: string; gender?: string }) {
    const email = (dto.email || '').trim().toLowerCase();
    const phone = (dto.phone || '').trim();

    let user = await this.usersRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (user) {
      if (['admin', 'owner', 'warden', 'super_admin'].includes(user.role)) {
        throw new ForbiddenException(
          `Unauthorized account: This email belongs to an ${user.role.toUpperCase()} account. Management accounts cannot register or book as guests.`
        );
      }
      if (dto.gender && !user.gender) {
        user.gender = dto.gender;
        await this.usersRepository.save(user);
      }
      const { password, ...result } = user;
      return result;
    }

    const timestamp = Date.now();
    const sanitized = (dto.name || 'guest').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const username = `guest_${sanitized}_${timestamp.toString().slice(-4)}`;
    const passwordHash = await bcrypt.hash(dto.password || 'guest123', 10);

    user = this.usersRepository.create({
      name: dto.name.trim(),
      email,
      phone,
      username,
      password: passwordHash,
      role: 'guest',
      gender: dto.gender || undefined,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
    });

    const saved = await this.usersRepository.save(user);
    const { password, ...result } = saved;
    return result;
  }

  // --- TENANT SPECIFIC WORKFLOWS ---

  async getTenants() {
    const tenants = await this.usersRepository.find({
      where: { role: 'tenant' },
      relations: {
        bookings: true,
        tenantStays: { roomEntity: true },
        payments: true,
      },
      order: { id: 'ASC' },
    });

    return tenants.map((t) => {
      const activeBooking =
        t.bookings?.find((b) => b.status === 'active') || t.bookings?.[0];
      const activeStay =
        t.tenantStays?.find((s) => s.status === 'active') || t.tenantStays?.[0];
      const latestPayment =
        t.payments && t.payments.length > 0
          ? t.payments[t.payments.length - 1]
          : null;

      const roomNumber =
        activeBooking?.room || activeStay?.roomEntity?.roomNumber || '101';
      const checkIn =
        activeBooking?.checkIn || activeStay?.moveInDate || t.joinDate;
      const rent = activeBooking?.rent ? Number(activeBooking.rent) : 8000;
      const paymentStatus = latestPayment
        ? latestPayment.status === 'verified'
          ? 'paid'
          : 'pending'
        : 'paid';

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        gender: t.gender,
        role: t.role,
        room: roomNumber,
        checkIn,
        rent,
        paymentStatus,
        status: t.status,
      };
    });
  }

  async createTenant(dto: CreateTenantDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Check for duplicate active tenant with same name and room
      const existingUsers = await manager.getRepository(User).find({
        where: { name: dto.name.trim() },
        relations: { bookings: true },
      });
      const duplicate = existingUsers.find((u) =>
        u.bookings?.some(
          (b) => b.room === dto.room.trim() && b.status === 'active',
        ),
      );
      if (duplicate) {
        throw new BadRequestException(
          `Tenant ${dto.name} is already registered in Room ${dto.room}`,
        );
      }

      // 2. Generate username and email if not provided
      const timestamp = Date.now();
      const sanitizedName = dto.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const username = `tenant_${sanitizedName}_${timestamp.toString().slice(-4)}`;
      const email =
        dto.email?.trim() ||
        `${sanitizedName}.${timestamp.toString().slice(-4)}@tenant.pgrentals.com`;
      const passwordHash = await bcrypt.hash('tenant123', 10);

      const userRepo = manager.getRepository(User);
      const newUser = userRepo.create({
        name: dto.name.trim(),
        email,
        phone: dto.phone.trim(),
        role: 'tenant',
        gender: dto.gender || undefined,
        username,
        password: passwordHash,
        status: 'active',
        joinDate: dto.checkIn || new Date().toISOString().split('T')[0],
      });
      const savedUser = await userRepo.save(newUser);

      // 3. Find or create Room
      const roomRepo = manager.getRepository(Room);
      let room = await roomRepo.findOne({
        where: { roomNumber: dto.room.trim(), propertyId: 1 },
      });

      if (!room) {
        room = await roomRepo.findOne({
          where: { roomNumber: dto.room.trim() },
        });
      }

      if (room) {
        room.currentOccupancy = (room.currentOccupancy || 0) + 1;
        if (room.currentOccupancy >= room.capacity && room.capacity > 0) {
          room.status = 'full';
        }
        await roomRepo.save(room);
      } else {
        room = roomRepo.create({
          roomNumber: dto.room.trim(),
          propertyId: 1,
          capacity: 2,
          currentOccupancy: 1,
          rent: dto.rent || 8000,
          status: 'available',
          maintenanceStatus: 'Ready',
        });
        room = await roomRepo.save(room);
      }

      // 4. Create Booking
      const bookingRepo = manager.getRepository(Booking);
      const newBooking = bookingRepo.create({
        tenantId: savedUser.id,
        propertyId: room.propertyId,
        roomId: room.id,
        room: room.roomNumber,
        checkIn: dto.checkIn || new Date().toISOString().split('T')[0],
        duration: '11 Months',
        rent: dto.rent || 8000,
        status: 'active',
      });
      await bookingRepo.save(newBooking);

      // 5. Create TenantStay
      const stayRepo = manager.getRepository(TenantStay);
      const newStay = stayRepo.create({
        tenantId: savedUser.id,
        propertyId: room.propertyId,
        roomId: room.id,
        moveInDate: dto.checkIn || new Date().toISOString().split('T')[0],
        status: 'active',
      });
      await stayRepo.save(newStay);

      // 6. Create Payment
      const paymentRepo = manager.getRepository(Payment);
      const isPaid = dto.paymentStatus === 'paid';
      const newPayment = paymentRepo.create({
        tenantId: savedUser.id,
        propertyId: room.propertyId,
        room: room.roomNumber,
        amount: dto.rent || 8000,
        method: 'UPI',
        transactionId: `TXN-${Date.now()}`,
        paidDate: new Date().toISOString().split('T')[0],
        status: isPaid ? 'verified' : 'pending',
        clearance: isPaid ? 'Approved' : 'Pending',
      });
      await paymentRepo.save(newPayment);

      return {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        room: room.roomNumber,
        checkIn: newBooking.checkIn,
        rent: Number(newBooking.rent),
        paymentStatus: isPaid ? 'paid' : 'pending',
        status: savedUser.status,
      };
    });
  }

  async updateTenant(id: number, dto: UpdateTenantDto) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({
        where: { id },
        relations: { bookings: true, tenantStays: true, payments: true },
      });
      if (!user) {
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }

      if (dto.name) user.name = dto.name.trim();
      if (dto.phone) user.phone = dto.phone.trim();
      if (dto.email) user.email = dto.email.trim();
      if (dto.gender) user.gender = dto.gender.trim();
      await userRepo.save(user);

      const bookingRepo = manager.getRepository(Booking);
      const roomRepo = manager.getRepository(Room);
      const stayRepo = manager.getRepository(TenantStay);
      const paymentRepo = manager.getRepository(Payment);

      const activeBooking =
        user.bookings?.find((b) => b.status === 'active') || user.bookings?.[0];

      let currentRoomNumber = activeBooking?.room || dto.room || '101';
      if (dto.room && activeBooking && activeBooking.room !== dto.room.trim()) {
        const oldRoom = await roomRepo.findOne({
          where: { roomNumber: activeBooking.room },
        });
        if (oldRoom && oldRoom.currentOccupancy > 0) {
          oldRoom.currentOccupancy -= 1;
          if (oldRoom.currentOccupancy < oldRoom.capacity) {
            oldRoom.status = 'available';
          }
          await roomRepo.save(oldRoom);
        }

        let newRoom = await roomRepo.findOne({
          where: { roomNumber: dto.room.trim() },
        });
        if (!newRoom) {
          newRoom = roomRepo.create({
            roomNumber: dto.room.trim(),
            propertyId: 1,
            capacity: 2,
            currentOccupancy: 1,
            rent: dto.rent || activeBooking.rent,
            status: 'available',
            maintenanceStatus: 'Ready',
          });
          newRoom = await roomRepo.save(newRoom);
        } else {
          newRoom.currentOccupancy = (newRoom.currentOccupancy || 0) + 1;
          if (
            newRoom.currentOccupancy >= newRoom.capacity &&
            newRoom.capacity > 0
          ) {
            newRoom.status = 'full';
          }
          await roomRepo.save(newRoom);
        }

        activeBooking.roomId = newRoom.id;
        activeBooking.room = newRoom.roomNumber;
        currentRoomNumber = newRoom.roomNumber;

        const activeStay =
          user.tenantStays?.find((s) => s.status === 'active') ||
          user.tenantStays?.[0];
        if (activeStay) {
          activeStay.roomId = newRoom.id;
          await stayRepo.save(activeStay);
        }
      }

      if (activeBooking) {
        if (dto.rent !== undefined) activeBooking.rent = dto.rent;
        if (dto.checkIn) activeBooking.checkIn = dto.checkIn;
        await bookingRepo.save(activeBooking);
      }

      if (dto.paymentStatus && user.payments && user.payments.length > 0) {
        const latestPayment = user.payments[user.payments.length - 1];
        latestPayment.status =
          dto.paymentStatus === 'paid' ? 'verified' : 'pending';
        latestPayment.clearance =
          dto.paymentStatus === 'paid' ? 'Approved' : 'Pending';
        await paymentRepo.save(latestPayment);
      } else if (dto.paymentStatus) {
        const newPayment = paymentRepo.create({
          tenantId: user.id,
          propertyId: activeBooking?.propertyId || 1,
          room: currentRoomNumber,
          amount: dto.rent || activeBooking?.rent || 8000,
          method: 'UPI',
          transactionId: `TXN-${Date.now()}`,
          paidDate: new Date().toISOString().split('T')[0],
          status: dto.paymentStatus === 'paid' ? 'verified' : 'pending',
          clearance: dto.paymentStatus === 'paid' ? 'Approved' : 'Pending',
        });
        await paymentRepo.save(newPayment);
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        room: currentRoomNumber,
        checkIn: activeBooking?.checkIn || user.joinDate,
        rent: Number(activeBooking?.rent || dto.rent || 8000),
        paymentStatus: dto.paymentStatus || 'pending',
        status: user.status,
      };
    });
  }

  async removeTenant(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({
        where: { id },
        relations: { bookings: true, tenantStays: true, payments: true },
      });
      if (!user) {
        throw new NotFoundException(`Tenant with ID ${id} not found`);
      }

      // Decrement room occupancy
      const roomRepo = manager.getRepository(Room);
      const activeBooking = user.bookings?.find((b) => b.status === 'active');
      if (activeBooking?.room) {
        const room = await roomRepo.findOne({
          where: { roomNumber: activeBooking.room },
        });
        if (room && room.currentOccupancy > 0) {
          room.currentOccupancy -= 1;
          if (room.currentOccupancy < room.capacity) {
            room.status = 'available';
          }
          await roomRepo.save(room);
        }
      }

      // Remove payments, bookings, stays, then user
      if (user.payments && user.payments.length > 0) {
        await manager.getRepository(Payment).remove(user.payments);
      }
      if (user.tenantStays && user.tenantStays.length > 0) {
        await manager.getRepository(TenantStay).remove(user.tenantStays);
      }
      if (user.bookings && user.bookings.length > 0) {
        await manager.getRepository(Booking).remove(user.bookings);
      }

      const removed = { ...user };
      await userRepo.remove(user);
      return removed;
    });
  }
}
