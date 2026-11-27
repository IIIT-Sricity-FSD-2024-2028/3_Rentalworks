import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { AuthUser, ownerPropertyIds } from '../common/crud';
import { Property } from '../properties/property.entity';
import { Notification } from '../notifications/notification.entity';
import { User } from '../users/user.entity';
import { DOCUMENT_TYPES, PropertyDocument, REQUIRED_DOCUMENT_TYPES } from './property-document.entity';

export const DOCUMENT_DIR = path.join(process.cwd(), 'private-uploads', 'property-documents');
export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

const LABEL: Record<string, string> = {
  ownership_proof: 'Ownership proof',
  id_proof: 'Owner ID proof',
  fire_safety_certificate: 'Fire safety certificate',
  trade_license: 'Trade licence',
  other: 'Other document',
};

@Injectable()
export class PropertyDocumentsService {
  constructor(
    @InjectRepository(PropertyDocument) private readonly repo: Repository<PropertyDocument>,
    private readonly db: DataSource,
  ) {}

  private async property(id: number) {
    const property = await this.db.getRepository(Property).findOneBy({ id });
    if (!property) throw new NotFoundException(`Property ${id} not found`);
    return property;
  }

  private assertCanAccess(user: AuthUser, property: Property) {
    if (user.role === 'owner' && property.ownerId !== user.id) {
      throw new ForbiddenException('This property does not belong to you');
    }
  }

  private async findOr404(id: number, withPath = false) {
    const qb = this.repo.createQueryBuilder('d').where('d.id = :id', { id });
    if (withPath) qb.addSelect('d.filePath');
    const doc = await qb.getOne();
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  private deleteFile(filePath?: string) {
    if (!filePath) return;
    const full = path.resolve(process.cwd(), filePath);
    // Only ever delete inside the documents folder.
    if (full.startsWith(DOCUMENT_DIR) && fs.existsSync(full)) fs.unlinkSync(full);
  }

  /**
   * docsVerified is derived, never typed: true only when every required
   * document type has an approved file.
   */
  async recomputeVerified(propertyId: number) {
    const approved = await this.repo.find({ where: { propertyId, status: 'approved' }, select: { docType: true } });
    const types = new Set(approved.map((d) => d.docType));
    const verified = REQUIRED_DOCUMENT_TYPES.every((t) => types.has(t));
    await this.db.getRepository(Property).update({ id: propertyId }, { docsVerified: verified });
    return verified;
  }

  async list(user: AuthUser, propertyId?: number) {
    const where: Record<string, unknown> = {};
    if (propertyId) where.propertyId = propertyId;
    if (user.role === 'owner') {
      const ids = await ownerPropertyIds(this.db, user.id);
      where.propertyId = propertyId ? (ids.includes(propertyId) ? propertyId : -1) : In(ids);
    }
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async upload(user: AuthUser, body: { propertyId?: string; docType?: string }, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a file to upload');
    const cleanup = () => this.deleteFile(path.relative(process.cwd(), file.path));
    try {
      if (!file.size) throw new BadRequestException('This file is empty. Choose the actual document');
      const propertyId = Number(body.propertyId);
      const docType = String(body.docType || '');
      if (!propertyId) throw new BadRequestException('propertyId is required');
      if (!(DOCUMENT_TYPES as readonly string[]).includes(docType)) {
        throw new BadRequestException(`docType must be one of: ${DOCUMENT_TYPES.join(', ')}`);
      }
      const property = await this.property(propertyId);
      this.assertCanAccess(user, property);

      // One current file per required type: a new upload replaces a pending or rejected one.
      if (docType !== 'other') {
        const previous = await this.repo
          .createQueryBuilder('d')
          .addSelect('d.filePath')
          .where('d.propertyId = :propertyId AND d.docType = :docType', { propertyId, docType })
          .getMany();
        if (previous.some((d) => d.status === 'approved') && user.role === 'owner') {
          throw new BadRequestException(`${LABEL[docType]} is already approved`);
        }
        for (const d of previous) {
          this.deleteFile(d.filePath);
          await this.repo.remove(d);
        }
      }

      const saved = await this.repo.save(
        this.repo.create({
          propertyId,
          ownerId: property.ownerId,
          docType,
          fileName: file.originalname,
          filePath: path.relative(process.cwd(), file.path),
          mimeType: file.mimetype,
          size: file.size,
          status: 'pending',
        }),
      );
      await this.recomputeVerified(propertyId);
      // Only admins are told; the owner already sees the upload on their property.
      if (user.role === 'owner') await this.notifyAdmins(property, `${LABEL[docType]} uploaded`, `${property.name}: ${LABEL[docType]} is waiting for review.`);
      const { filePath, ...result } = saved;
      return result;
    } catch (err) {
      cleanup();
      throw err;
    }
  }

  /** Admin review: approve or reject a document (a reason is required to reject). */
  async review(user: AuthUser, id: number, body: { status?: string; reviewNote?: string }) {
    const status = String(body.status || '');
    if (!['approved', 'rejected', 'pending'].includes(status)) throw new BadRequestException('status must be approved, rejected or pending');
    const note = (body.reviewNote || '').trim();
    if (status === 'rejected' && !note) throw new BadRequestException('Give the owner a reason for rejecting this document');

    const doc = await this.findOr404(id);
    Object.assign(doc, {
      status,
      reviewNote: note || null,
      reviewedBy: status === 'pending' ? null : user.id,
      reviewedAt: status === 'pending' ? null : new Date(),
    });
    await this.repo.save(doc);
    const verified = await this.recomputeVerified(doc.propertyId);

    const property = await this.property(doc.propertyId);
    if (status !== 'pending') {
      await this.db.getRepository(Notification).save({
        title: status === 'approved' ? `${LABEL[doc.docType] || 'Document'} approved` : `${LABEL[doc.docType] || 'Document'} rejected`,
        message:
          status === 'approved'
            ? `${property.name}: your ${LABEL[doc.docType] || 'document'} was approved.${verified ? ' All required documents are now verified.' : ''}`
            : `${property.name}: your ${LABEL[doc.docType] || 'document'} was rejected. Reason: ${note}. Please upload a new file.`,
        type: status === 'approved' ? 'success' : 'warning',
        priority: 'normal',
        userId: property.ownerId,
        byUserId: user.id,
        targetRole: 'owner',
        sentAt: new Date().toISOString(),
      } as Partial<Notification>);
    }
    return { ...doc, docsVerified: verified };
  }

  async remove(user: AuthUser, id: number) {
    const doc = await this.findOr404(id, true);
    const property = await this.property(doc.propertyId);
    this.assertCanAccess(user, property);
    if (user.role === 'owner' && doc.status === 'approved') {
      throw new BadRequestException('An approved document can only be removed by an admin');
    }
    this.deleteFile(doc.filePath);
    await this.repo.remove(doc);
    await this.recomputeVerified(property.id);
    return { id };
  }

  /** Absolute path + metadata for streaming the file to an allowed user. */
  async fileFor(user: AuthUser, id: number) {
    const doc = await this.findOr404(id, true);
    const property = await this.property(doc.propertyId);
    this.assertCanAccess(user, property);
    const full = path.resolve(process.cwd(), doc.filePath);
    if (!full.startsWith(DOCUMENT_DIR) || !fs.existsSync(full)) throw new NotFoundException('The file is missing on the server');
    return { full, doc };
  }

  private async notifyAdmins(property: Property, title: string, message: string) {
    const admins = await this.db.getRepository(User).findBy({ role: 'admin', status: 'active' });
    for (const admin of admins) {
      await this.db.getRepository(Notification).save({
        title,
        message,
        type: 'info',
        priority: 'normal',
        userId: admin.id,
        targetRole: 'admin',
        sentAt: new Date().toISOString(),
      } as Partial<Notification>);
    }
  }
}
