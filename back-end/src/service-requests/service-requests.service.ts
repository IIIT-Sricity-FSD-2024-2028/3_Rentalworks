import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class ServiceRequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private readonly serviceRequestsRepository: Repository<ServiceRequest>,
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(
    createDto: CreateServiceRequestDto,
    tenantId: number,
  ): Promise<ServiceRequest> {
    const finalTenantId = tenantId || createDto.tenantId;
    if (!finalTenantId) {
      throw new ForbiddenException('Tenant ID is required to create a service request.');
    }

    let serviceName = createDto.serviceName || createDto.serviceType || 'Service Request';
    let serviceType = createDto.serviceType || createDto.serviceName || 'General';
    let amount = createDto.amount || 0;

    // If serviceId was provided, resolve service info and price
    if (createDto.serviceId) {
      const srv = await this.servicesRepository.findOne({
        where: { id: createDto.serviceId },
      });
      if (srv) {
        serviceName = srv.name;
        serviceType = srv.name;
        if (!amount && srv.price) {
          amount = Number(srv.price);
        }
      }
    }

    const serviceRequest = this.serviceRequestsRepository.create({
      ...createDto,
      serviceName,
      serviceType,
      amount,
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

    if (role === 'tenant' && currentUserId && request.tenantId !== currentUserId) {
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
    const request = await this.findOne(id, currentUserId, role);
    const oldStatus = request.status;

    if (
      updateDto.status &&
      updateDto.status === ServiceRequestStatus.COMPLETED &&
      !request.completedAt
    ) {
      updateDto.completedAt = new Date();
    }

    Object.assign(request, updateDto);
    if (updateDto.description) request.notes = updateDto.description;
    if (updateDto.notes) request.description = updateDto.notes;

    const updated = await this.serviceRequestsRepository.save(request);

    // If status changed, notify tenant
    if (updateDto.status && updateDto.status !== oldStatus) {
      try {
        const notif = this.notificationsRepository.create({
          title: 'Service Request Status Updated',
          message: `Your service request for "${request.serviceName}" is now ${request.status}.`,
          type: 'service_request_status',
          priority: 'medium',
          recipients: 1,
          userId: request.tenantId,
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
    const request = await this.findOne(id, currentUserId, role);
    const clone = { ...request };
    await this.serviceRequestsRepository.remove(request);
    return clone;
  }
}
