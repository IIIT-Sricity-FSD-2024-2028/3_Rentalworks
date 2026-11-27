import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ServiceRequest,
  ServiceRequestStatus,
} from './service-request.entity';
import {
  CreateServiceRequestDto,
  UpdateServiceRequestDto,
} from './service-requests.dto';
import { Notification } from '../notifications/notification.entity';
import { Service } from '../services/service.entity';
import { TenantStay } from '../tenant-stays/tenant-stay.entity';
import { todayIST } from '../rent-dues/rent-dues.helpers';
import { lockTenantBilling, toCents } from '../rent-dues/service-billing';

// Standard offers used when a property has no configured service catalogue.
const STANDARD_SERVICES = new Map([
  ['laundry', { name: 'Laundry', price: 50, pricingModel: 'per_kg' }],
  ['parking', { name: 'Parking', price: 500, pricingModel: 'per_month' }],
  ['room cleaning', { name: 'Room Cleaning', price: 150, pricingModel: 'per_session' }],
  ['pantry & appliances', { name: 'Pantry & Appliances', price: 0, pricingModel: 'included_in_rent' }],
]);

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestsRepository: Repository<ServiceRequest>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateServiceRequestDto,
    tenantId: number,
  ): Promise<ServiceRequest> {
    const finalTenantId = tenantId || createDto.tenantId;
    if (!finalTenantId) {
      throw new ForbiddenException('Tenant ID is required to create a service request.');
    }

    const stay = await this.dataSource.getRepository(TenantStay).findOne({
      where: { tenantId: finalTenantId, status: 'active', ...(createDto.propertyId ? { propertyId: createDto.propertyId } : {}) },
      order: { id: 'DESC' },
    });
    if (!stay) throw new BadRequestException('An active stay at this PG is required to request a service');

    const requestedName = (createDto.serviceName || createDto.serviceType || '').trim().toLowerCase();
    const catalogue = await this.servicesRepository.find({ where: { propertyId: stay.propertyId } });
    const offer = createDto.serviceId != null
      ? catalogue.find((service) => service.id === createDto.serviceId && service.isAvailable)
      : catalogue.length
        ? catalogue.find((service) => service.isAvailable && service.name.toLowerCase() === requestedName)
        : STANDARD_SERVICES.get(requestedName === 'cleaning' ? 'room cleaning' : requestedName);
    if (!offer) throw new BadRequestException('This service is unavailable at your PG');
    const pricingModel = offer.pricingModel || 'per_use';
    const quantity = createDto.quantity ?? 1;
    if (pricingModel !== 'per_kg' && quantity !== 1) {
      throw new BadRequestException('This service is billed once per request');
    }
    const amount = pricingModel === 'included_in_rent' ? 0 : Math.round(toCents(offer.price) * quantity) / 100;
    if (!Number.isFinite(amount) || amount < 0 || amount > 99999999.99) {
      throw new BadRequestException('This service has an invalid price');
    }
    if (createDto.amount != null && toCents(createDto.amount) !== toCents(amount)) {
      throw new ConflictException('The service price changed. Reload the catalogue and review the charge.');
    }

    const serviceRequest = this.serviceRequestsRepository.create({
      serviceId: 'id' in offer && typeof offer.id === 'number' ? offer.id : undefined,
      serviceName: offer.name,
      serviceType: createDto.serviceType || offer.name,
      amount,
      quantity,
      pricingModel,
      propertyId: stay.propertyId,
      roomId: stay.roomId,
      description: createDto.description || createDto.notes,
      notes: createDto.notes || createDto.description,
      tenantId: finalTenantId,
      status: ServiceRequestStatus.PENDING,
    });

    const savedRequest = await this.serviceRequestsRepository.save(serviceRequest);

    // Notify tenant
    try {
      const notif = this.notificationsRepository.create({
        title: 'Service Request Created',
        message: `Your request for "${savedRequest.serviceName}" has been submitted.`,
        type: 'service_request',
        priority: 'medium',
        recipients: 1,
        userId: finalTenantId,
        isRead: false,
        sentAt: new Date().toISOString(),
      });
      await this.notificationsRepository.save(notif);
    } catch (err) {
      // Non-critical background notification
    }

    return savedRequest;
  }

  async findMy(tenantId: number): Promise<ServiceRequest[]> {
    return this.serviceRequestsRepository.find({
      where: { tenantId },
      relations: { property: true, roomEntity: true, service: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(propertyId?: number, status?: string): Promise<ServiceRequest[]> {
    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;

    return this.serviceRequestsRepository.find({
      where,
      relations: { tenant: true, property: true, roomEntity: true, service: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: number,
    currentUserId?: number,
    role?: string,
  ): Promise<ServiceRequest> {
    const request = await this.serviceRequestsRepository.findOne({
      where: { id },
      relations: { tenant: true, property: true, roomEntity: true, service: true },
    });

    if (!request) {
      throw new NotFoundException(`Service request with ID ${id} not found`);
    }

    if (role === 'tenant' && request.tenantId !== currentUserId) {
      throw new ForbiddenException('You can only view your own service requests.');
    }

    return request;
  }

  async update(
    id: number,
    updateDto: UpdateServiceRequestDto,
    currentUserId?: number,
    role?: string,
  ): Promise<ServiceRequest> {
    const original = await this.findOne(id, currentUserId, role);
    const { updated, oldStatus } = await this.dataSource.transaction(async (manager) => {
      await lockTenantBilling(manager, original.tenantId);
      const repo = manager.getRepository(ServiceRequest);
      const request = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!request) throw new NotFoundException(`Service request with ID ${id} not found`);
      const oldStatus = request.status;
      if (oldStatus === ServiceRequestStatus.COMPLETED || oldStatus === ServiceRequestStatus.CANCELLED) {
        if (updateDto.status === oldStatus) return { updated: request, oldStatus };
        throw new ConflictException('This service request is already closed');
      }
      if (updateDto.status) request.status = updateDto.status;
      const notes = updateDto.notes ?? updateDto.description;
      if (notes !== undefined) request.notes = request.description = notes;
      if (updateDto.scheduledAt) request.scheduledAt = updateDto.scheduledAt;
      if (updateDto.status === ServiceRequestStatus.COMPLETED) {
        request.completedAt = new Date();
        if (request.pricingModel && Number(request.amount) > 0) request.billableFrom = todayIST();
      }
      return { updated: await repo.save(request), oldStatus };
    });

    // If status changed, notify tenant
    if (updateDto.status && updateDto.status !== oldStatus) {
      try {
        const notif = this.notificationsRepository.create({
          title: 'Service Request Status Updated',
          message: updated.billableFrom
            ? `Your ${updated.serviceName} request is complete. A ₹${Number(updated.amount).toLocaleString('en-IN')} charge will appear in Payments.`
            : `Your service request for "${updated.serviceName}" is now ${updated.status}.`,
          type: 'service_request_status',
          priority: 'medium',
          recipients: 1,
          userId: updated.tenantId,
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

  async remove(
    id: number,
    currentUserId?: number,
    role?: string,
  ): Promise<ServiceRequest> {
    const original = await this.findOne(id, currentUserId, role);
    return this.dataSource.transaction(async (manager) => {
      await lockTenantBilling(manager, original.tenantId);
      const repo = manager.getRepository(ServiceRequest);
      const request = await repo.findOneBy({ id });
      if (!request) throw new NotFoundException(`Service request with ID ${id} not found`);
      if (request.status === ServiceRequestStatus.COMPLETED) throw new ConflictException('A completed service cannot be cancelled');
      // Cancellation stays in history so tenants can distinguish it from completed usage.
      request.status = ServiceRequestStatus.CANCELLED;
      return repo.save(request);
    });
  }
}
