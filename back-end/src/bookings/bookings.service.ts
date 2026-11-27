import { endStays, recountRooms } from '../common/occupancy';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
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

  findAll(tenantId?: number | number[], propertyId?: number) {
    const where: any = {};
    const okId = (n: number) => Number.isInteger(n) && n > 0 && n <= 2147483647;
    if (Array.isArray(tenantId)) {
      where.tenantId = In(tenantId.filter(okId));
    } else if (tenantId && okId(tenantId)) {
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

  /** Statuses that mean the tenant no longer occupies the bed. */
  private static readonly ENDED = ['cancelled', 'canceled', 'checked_out', 'checked-out', 'completed', 'rejected', 'evicted'];
  private static readonly LIVE = ['confirmed', 'active', 'pending'];

  /** End the booking's stay (that tenant, that room), cancel future rent, recount the room. */
  private async releaseBed(manager: EntityManager, booking: Booking, reason: string, stayStatus: string) {
    const rooms = await endStays(manager, { tenantId: booking.tenantId, roomId: booking.roomId, bookingId: booking.id, reason, status: stayStatus });
    await recountRooms(manager, [...rooms, ...(booking.roomId ? [booking.roomId] : [])]);
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id } });
      if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
      const before = String(booking.status || '').toLowerCase();
      const cleanDto = Object.fromEntries(
        Object.entries(updateBookingDto).filter(([_, v]) => v !== undefined),
      );
      Object.assign(booking, cleanDto);
      const saved = await manager.getRepository(Booking).save(booking);
      const after = String(saved.status || '').toLowerCase();
      // Cancelled / checked out etc.: the bed is free again everywhere.
      if (BookingsService.ENDED.includes(after) && !BookingsService.ENDED.includes(before)) {
        await this.releaseBed(manager, saved, `Booking ${after.replace(/[_-]/g, ' ')}`, after === 'evicted' ? 'evicted' : 'ended');
      }
      return saved;
    });
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.getRepository(Booking).findOne({ where: { id } });
      if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
      const removed = { ...booking };
      if (BookingsService.LIVE.includes(String(booking.status || '').toLowerCase())) {
        await this.releaseBed(manager, booking, 'Booking deleted', 'ended');
      }
      await manager.getRepository(Booking).remove(booking);
      return removed;
    });
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
      // Never book a different PG than the one chosen, and only live listings.
      if (!property) throw new BadRequestException('This PG could not be found. Please choose it again from the listings.');
      const listingOwner = await userRepo.findOne({ where: { id: property.ownerId } });
      if (String(property.status).toLowerCase() !== 'approved' || listingOwner?.status !== 'active') {
        throw new BadRequestException(`${property.name} is not taking bookings right now.`);
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

      // 3b. A NEW tenant account for THIS booking.
      //     Every booking gets its own account with a new, unique Tenant ID
      //     (TENANT-######, unique index on users.username). Signing in with that
      //     Tenant ID opens the tenant dashboard for this PG only.
      //     The booker's guest account stays a guest (browse, book, booking history).
      //     - Booker has an account: the tenant account gets the SAME password
      //       (the stored hash is copied; the plain password is never seen).
      //     - Nobody has an account yet (e.g. booking for a friend): a temporary
      //       password is issued and shown once on the receipt.
      //     A per-booking tenant account that books again counts as its guest.
      let owner: User | null = user;
      const parentGuestId = Number(owner?.preferences?.guestId);
      if (owner?.role === 'tenant' && parentGuestId) {
        owner = (await userRepo.findOne({ where: { id: parentGuestId } })) ?? owner;
      }
      const isExistingAccount = !!owner;
      const tenantUsername = await this.generateTenantUsername(userRepo);
      let issuedPassword: string | null = null;
      let passwordHash: string | null = null;
      if (owner) {
        const withPassword = await userRepo
          .createQueryBuilder('u')
          .addSelect('u.password')
          .where('u.id = :id', { id: owner.id })
          .getOne();
        passwordHash = withPassword?.password || null;
      }
      if (!passwordHash) {
        issuedPassword = this.generateTempPassword();
        passwordHash = await bcrypt.hash(issuedPassword, 10);
      }

      // The guest account keeps its role; remember the gender used for eligibility.
      if (owner && !owner.gender) {
        owner.gender = normalizedGender;
        await userRepo.save(owner);
      }

      user = await userRepo.save(
        userRepo.create({
          name: dto.name.trim() || owner?.name,
          // Per-booking accounts sign in by Tenant ID only; email stays on the guest account.
          email: owner ? (null as any) : dto.email.trim().toLowerCase(),
          phone: dto.phone.trim() || owner?.phone,
          role: 'tenant',
          gender: normalizedGender,
          username: tenantUsername,
          password: passwordHash,
          status: 'active',
          joinDate: dto.checkIn || todayIST(),
          preferences: {
            guestId: owner?.id ?? null,
            propertyId: propId,
            contactEmail: owner?.email || dto.email.trim().toLowerCase(),
          },
        }),
      );

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
          email: user.preferences?.contactEmail || user.email,
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
          email: user.preferences?.contactEmail || user.email,
          // null when the tenant account uses the same password as the booker's account
          password: issuedPassword,
          samePasswordAsAccount: issuedPassword === null,
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
