import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Booking } from './booking.entity';
import { CreateBookingDto, UpdateBookingDto, CheckoutBookingDto } from './bookings.dto';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { Room } from '../rooms/room.entity';
import { Property } from '../properties/property.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { WardenNotification } from '../warden-notifications/warden-notification.entity';
import { Notification } from '../notifications/notification.entity';
import { createInitialDue, todayIST } from '../rent-dues/rent-dues.helpers';
import { PaymentGatewayService, checkoutPrice } from '../payments/payment-gateway.service';
import { checkoutReceipt } from '../payments/payment-gateway.controller';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingsRepository: Repository<Booking>,
    private dataSource: DataSource,
    private readonly gateway: PaymentGatewayService,
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

  /** `bookerId` is the signed-in account paying (the tenant, or the friend booking for them). */
  async completeCheckout(dto: CheckoutBookingDto, bookerId: number) {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
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

      // 3b. Tenant credentials. If the user already has an account (guest or tenant),
      //     we PRESERVE their existing password and username.
      //     Only a brand-new user without an account gets a generated TENANT-###### id and a temporary password.
      const isExistingAccount = !!user;
      let tenantUsername: string;
      let issuedPassword: string | null = null;
      if (isExistingAccount && user) {
        tenantUsername = user.username;
      } else {
        tenantUsername = await this.generateTenantUsername(userRepo);
        issuedPassword = this.generateTempPassword();
      }
      const passwordHash = issuedPassword ? await bcrypt.hash(issuedPassword, 10) : null;
      const timestamp = Date.now();

      if (user) {
        user.role = 'tenant';
        user.status = 'active';
        user.name = dto.name.trim() || user.name;
        user.phone = dto.phone.trim() || user.phone;
        user.gender = normalizedGender;
        // Do NOT overwrite password or username if user already exists
        user.joinDate = isExistingAccount ? user.joinDate : dto.checkIn || user.joinDate || todayIST();
        user = await userRepo.save(user);
      } else {
        user = userRepo.create({
          name: dto.name.trim(),
          email: dto.email.trim(),
          phone: dto.phone.trim(),
          role: 'tenant',
          gender: normalizedGender,
          username: tenantUsername,
          password: passwordHash as string,
          status: 'active',
          joinDate: dto.checkIn || todayIST(),
        });
        user = await userRepo.save(user);
      }

      // 3c. Resolve room + bed. Rooms are row-locked so two simultaneous checkouts can never
      //     take the same bed; the partial unique index uq_active_stay_bed is the last line of defence.
      const isSingleRoom =
        dto.roomType?.toLowerCase().includes('single') ||
        dto.roomType?.toLowerCase().includes('private');
      const allocation = await this.allocateRoomAndBed(manager, {
        propertyId: propId,
        requestedRoomNumber: dto.roomNumber?.trim(),
        isSingle: !!isSingleRoom,
        isTriple: !!dto.roomType?.toLowerCase().includes('triple'),
        rent: Number(dto.rent) || 0,
      });
      const room = allocation.room;
      const roomNum = room.roomNumber;
      const bedNumber = allocation.bedNumber;

      // 4. Create Confirmed Booking Record
      const checkInDate = dto.checkIn || todayIST();
      // 3d. Price comes from the allocated room, and the gateway payment must be
      //     for exactly that amount and that room. Nothing is trusted from the form.
      const price = checkoutPrice(Number(room.rent));
      const paid = await this.gateway.verify(
        { orderId: dto.gatewayOrderId, paymentId: dto.gatewayPaymentId, signature: dto.gatewaySignature },
        price.total,
        checkoutReceipt(bookerId, propId, roomNum),
      );
      const monthlyRent = price.rent;
      const newBooking = bookingRepo.create({
        tenantId: user.id,
        propertyId: propId,
        roomId: room.id,
        room: roomNum,
        bedNumber,
        checkIn: checkInDate,
        duration: dto.duration || '6 Months',
        rent: monthlyRent,
        status: 'confirmed',
      });
      const savedBooking = await bookingRepo.save(newBooking);

      // 5. Create Payment Record (Verified / Cleared) with the receipt breakdown:
      //    rent + deposit + platform fee = total paid.
      const txnId = paid.transactionId;
      const depositAmount = price.deposit;
      const totalAmount = price.total;
      const feeAmount = price.fee;
      const newPayment = paymentRepo.create({
        tenantId: user.id,
        propertyId: propId,
        roomId: room.id,
        room: roomNum,
        bedNumber,
        amount: totalAmount,
        rentAmount: monthlyRent,
        depositAmount,
        feeAmount,
        kind: 'booking',
        method: paid.mode === 'test' ? 'TEST' : dto.paymentMethod || 'ONLINE',
        transactionId: txnId,
        paidDate: todayIST(),
        status: 'verified',
        clearance: paid.mode === 'test' ? 'Test payment' : 'Cleared',
        platformFee: feeAmount,
      });
      const savedPayment = await paymentRepo.save(newPayment);

      // 6. Create Active Tenant Stay (bed-level allotment)
      const newStay = stayRepo.create({
        tenantId: user.id,
        propertyId: propId,
        roomId: room.id,
        bedNumber,
        moveInDate: checkInDate,
        status: 'active',
      });
      let savedStay: TenantStay;
      try {
        savedStay = await stayRepo.save(newStay);
      } catch (err: any) {
        if (err?.code === '23505') {
          throw new BadRequestException('That bed was just taken by another booking. Please go back and pick again.');
        }
        throw err;
      }

      // 6b. Ledger: cycle 1 is paid by this very payment (7/3/1-day automation takes over from cycle 2)
      await createInitialDue(manager, {
        tenantId: user.id,
        stayId: savedStay.id,
        bookingId: savedBooking.id,
        propertyId: propId,
        roomId: room.id,
        checkIn: checkInDate,
        rent: monthlyRent,
        paymentId: savedPayment.id,
      });

      // 6c. Fresh notification feed for this tenant: welcome + booking confirmation only.
      const notifRepo = manager.getRepository(Notification);
      const bedLabel = bedNumber ? `, Bed ${bedNumber}` : '';
      await notifRepo.save([
        {
          title: `Welcome to ${propName}!`,
          message: `Hi ${user.name}, your tenant account is ready. Your room is #${roomNum}${bedLabel}. Reach your warden from Complaints or Issues any time.`,
          type: 'info',
          priority: 'normal',
          recipients: 1,
          sentAt: todayIST(),
          userId: user.id,
          targetPropertyId: propId,
          read: false,
          isRead: false,
        },
        {
          title: 'Booking confirmed',
          message: `Payment of ₹${totalAmount.toLocaleString('en-IN')} received (Txn ${txnId}). ${dto.roomType || 'Room'} #${roomNum}${bedLabel} at ${propName}, move-in ${checkInDate}. Your next rent is due one month after move-in.`,
          type: 'booking',
          priority: 'normal',
          recipients: 1,
          sentAt: todayIST(),
          userId: user.id,
          targetPropertyId: propId,
          read: false,
          isRead: false,
        },
      ] as any);

      // 7. Route Automated Notification to Warden
      const wardenNotification = wardenNotifRepo.create({
        title: 'New Tenant Booking Confirmed',
        message: `${user.name} has completed payment (₹${totalAmount.toLocaleString()}) and booked ${dto.roomType || 'Room'} (Room #${roomNum}${bedLabel}) at ${propName}.`,
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
        message: 'Booking confirmed and tenant account created successfully',
        tenant: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          username: user.username,
          role: user.role,
          status: user.status,
          room: roomNum,
          bedNumber,
          propertyId: propId,
        },
        credentials: {
          username: user.username,
          email: user.email,
          // null when the person already had an account (their existing password still works)
          password: issuedPassword,
          existingAccount: isExistingAccount,
        },
        booking: {
          id: savedBooking.id,
          bookingCode: `BK-${savedBooking.id.toString().padStart(5, '0')}`,
          room: roomNum,
          bedNumber,
          roomType: dto.roomType,
          checkIn: savedBooking.checkIn,
          duration: savedBooking.duration,
          rent: Number(savedBooking.rent),
          status: savedBooking.status,
          property: propName,
          propertyId: propId,
        },
        payment: {
          id: savedPayment.id,
          transactionId: txnId,
          amount: Number(savedPayment.amount),
          rentAmount: monthlyRent,
          depositAmount,
          feeAmount,
          method: savedPayment.method,
          status: savedPayment.status,
          paidDate: savedPayment.paidDate,
          paidAt: new Date().toISOString(),
        },
      };
    });
  }

  /* ---------------------------------------------------------------------- *
   * Helpers
   * ---------------------------------------------------------------------- */

  private async generateTenantUsername(userRepo: Repository<User>): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const candidate = `TENANT-${randomInt(100000, 1000000)}`;
      if (!(await userRepo.existsBy({ username: candidate }))) return candidate;
    }
    return `TENANT-${Date.now().toString().slice(-9)}`;
  }

  /** 10 chars, no look-alikes (0/O, 1/l/I), guaranteed upper + lower + digit + symbol. */
  private generateTempPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '@#$%&*';
    const pick = (set: string) => set[randomInt(set.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    const all = upper + lower + digits;
    while (chars.length < 10) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  /**
   * Picks a room with a genuinely free bed and returns the lowest free bed label.
   * Rooms are locked FOR UPDATE inside the checkout transaction, so concurrent checkouts serialise.
   */
  private async allocateRoomAndBed(
    manager: EntityManager,
    p: { propertyId: number; requestedRoomNumber?: string; isSingle: boolean; isTriple: boolean; rent: number },
  ): Promise<{ room: Room; bedNumber: string }> {
    const roomRepo = manager.getRepository(Room);
    const stayRepo = manager.getRepository(TenantStay);
    const lock = { mode: 'pessimistic_write' as const };

    const suitable = (r: Room) => (p.isSingle ? Number(r.capacity) === 1 : Number(r.capacity || 2) > 1);
    const hasFreeBed = (r: Room) => (r.currentOccupancy || 0) < (r.capacity || 1) && r.status !== 'full';

    const takeBed = async (r: Room): Promise<string | null> => {
      const active = await stayRepo.find({ where: { roomId: r.id, status: 'active' } });
      const taken = new Set(active.map((s) => s.bedNumber).filter(Boolean));
      for (let i = 1; i <= Math.max(Number(r.capacity) || 1, 1); i++) {
        if (!taken.has(`B${i}`)) return `B${i}`;
      }
      return null;
    };

    let room: Room | null = null;
    let bed: string | null = null;

    if (p.requestedRoomNumber) {
      const cand = await roomRepo.findOne({ where: { roomNumber: p.requestedRoomNumber, propertyId: p.propertyId }, lock });
      if (cand && suitable(cand) && hasFreeBed(cand)) {
        bed = await takeBed(cand);
        if (bed) room = cand;
      }
    }

    if (!room) {
      const all = await roomRepo.find({ where: { propertyId: p.propertyId }, order: { id: 'ASC' } });
      for (const c of all) {
        if (!suitable(c)) continue;
        const locked = await roomRepo.findOne({ where: { id: c.id }, lock });
        if (!locked || !hasFreeBed(locked)) continue;
        const b = await takeBed(locked);
        if (b) {
          room = locked;
          bed = b;
          break;
        }
      }
    }

    if (!room || !bed) {
      // Nothing free: provision a new room so a paid booking is never lost.
      const capacity = p.isSingle ? 1 : p.isTriple ? 3 : 2;
      const number = p.isSingle ? `S-${randomInt(104, 904)}` : `R-${randomInt(101, 901)}`;
      room = await roomRepo.save(
        roomRepo.create({
          roomNumber: p.requestedRoomNumber && !p.isSingle ? p.requestedRoomNumber : number,
          propertyId: p.propertyId,
          capacity,
          currentOccupancy: 0,
          rent: p.rent || (p.isSingle ? 16000 : 8500),
          status: 'available',
          maintenanceStatus: 'Ready',
        }),
      );
      bed = 'B1';
    }

    room.currentOccupancy = (room.currentOccupancy || 0) + 1;
    room.status = room.currentOccupancy >= room.capacity ? 'full' : 'available';
    await roomRepo.save(room);
    return { room, bedNumber: bed };
  }
}
