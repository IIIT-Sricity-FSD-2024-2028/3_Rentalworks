import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoommateProfile } from './roommate-profile.entity';
import { Room } from '../rooms/room.entity';

@Injectable()
export class RoommatesService {
  constructor(
    @InjectRepository(RoommateProfile)
    private readonly roommateProfileRepo: Repository<RoommateProfile>,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
  ) {}

  async findTenantsByProperty(propertyId: number): Promise<RoommateProfile[]> {
    return this.roommateProfileRepo.find({
      where: { propertyId, isTenant: true },
      order: { id: 'ASC' },
    });
  }

  async calculateMatches(guestProfile: any): Promise<any[]> {
    const propertyId = guestProfile.propertyId ? Number(guestProfile.propertyId) : 1;

    // Canonical source of truth for room sharing type
    let targetSharing = '';
    let targetCapacity = guestProfile.capacity ? Number(guestProfile.capacity) : 0;

    if (guestProfile.roomId) {
      try {
        const room = await this.roomRepo.findOne({ where: { id: Number(guestProfile.roomId) } });
        if (room) {
          targetCapacity = room.capacity;
          const rType = (room.roomType || '').toLowerCase();
          if (room.capacity === 1 || rType.includes('single')) {
            targetSharing = 'single';
          } else if (room.capacity === 3 || rType.includes('triple')) {
            targetSharing = 'triple';
          } else if (room.capacity === 2 || rType.includes('double')) {
            targetSharing = 'double';
          }
        }
      } catch (err) {
        // fallback to guestProfile attributes
      }
    }

    if (!targetSharing) {
      const raw = (guestProfile.sharingType || guestProfile.roomType || guestProfile.sharing || '').toLowerCase();
      if (raw.includes('single') || targetCapacity === 1) {
        targetSharing = 'single';
      } else if (raw.includes('triple') || targetCapacity === 3) {
        targetSharing = 'triple';
      } else if (raw.includes('double') || targetCapacity === 2) {
        targetSharing = 'double';
      }
    }

    // Single sharing room has NO roommates
    if (targetSharing === 'single' || targetCapacity === 1) {
      return [];
    }

    let tenants = await this.roommateProfileRepo.find({
      where: { propertyId, isTenant: true },
    });

    if (tenants.length === 0) {
      tenants = await this.roommateProfileRepo.find({
        where: { isTenant: true },
      });
    }

    // Filter candidate tenants strictly by sharing type BEFORE calculating compatibility
    if (targetSharing) {
      tenants = tenants.filter((tenant) => {
        const tenantSharing = (tenant.roomType || '').toLowerCase();
        if (targetSharing === 'triple') {
          return tenantSharing.includes('triple') || tenantSharing.includes('3');
        }
        if (targetSharing === 'double') {
          return tenantSharing.includes('double') || tenantSharing.includes('2');
        }
        return true;
      });
    }

    if (tenants.length === 0) {
      return [];
    }

    const guestInterests = Array.isArray(guestProfile.interests)
      ? guestProfile.interests.map((i: string) => i.toLowerCase().replace(/#/g, ''))
      : [];

    const scoredTenants = tenants.map((tenant) => {
      let score = 50; // base score

      // 1. Sleep Schedule match (up to 20 points)
      if (guestProfile.sleepSchedule && tenant.sleepSchedule) {
        if (guestProfile.sleepSchedule.toLowerCase() === tenant.sleepSchedule.toLowerCase()) {
          score += 20;
        } else if (
          guestProfile.sleepSchedule.toLowerCase().includes('flexible') ||
          tenant.sleepSchedule.toLowerCase().includes('flexible')
        ) {
          score += 12;
        }
      }

      // 2. Cleanliness match (up to 15 points)
      if (guestProfile.cleanliness && tenant.cleanliness) {
        if (guestProfile.cleanliness.toLowerCase() === tenant.cleanliness.toLowerCase()) {
          score += 15;
        } else if (
          guestProfile.cleanliness.toLowerCase().includes('moderate') ||
          tenant.cleanliness.toLowerCase().includes('moderate')
        ) {
          score += 8;
        }
      }

      // 3. Food Habit match (up to 10 points)
      if (guestProfile.foodHabit && tenant.foodHabit) {
        if (guestProfile.foodHabit.toLowerCase() === tenant.foodHabit.toLowerCase()) {
          score += 10;
        } else if (
          guestProfile.foodHabit.toLowerCase().includes('flexible') ||
          tenant.foodHabit.toLowerCase().includes('flexible')
        ) {
          score += 6;
        }
      }

      // 4. Drinking match (up to 10 points)
      if (guestProfile.drinking && tenant.drinking) {
        if (guestProfile.drinking.toLowerCase() === tenant.drinking.toLowerCase()) {
          score += 10;
        } else if (
          guestProfile.drinking.toLowerCase().includes('occasional') ||
          tenant.drinking.toLowerCase().includes('occasional')
        ) {
          score += 5;
        }
      }

      // 5. Smoking match (up to 10 points)
      if (guestProfile.smoking && tenant.smoking) {
        if (guestProfile.smoking.toLowerCase() === tenant.smoking.toLowerCase()) {
          score += 10;
        }
      }

      // 6. Common hobbies & interests overlap (up to 15 points)
      const tenantInterests = Array.isArray(tenant.interests)
        ? tenant.interests.map((i: string) => i.toLowerCase().replace(/#/g, ''))
        : [];

      const sharedInterests = guestInterests.filter((gi: string) =>
        tenantInterests.some((ti: string) => ti.includes(gi) || gi.includes(ti)),
      );
      score += Math.min(15, sharedInterests.length * 5);

      // 7. Profession / Workplace proximity (up to 5 points)
      if (
        guestProfile.company &&
        tenant.company &&
        guestProfile.company.toLowerCase() === tenant.company.toLowerCase()
      ) {
        score += 5;
      } else if (
        guestProfile.profession &&
        tenant.profession &&
        guestProfile.profession.toLowerCase().includes('engineer') &&
        tenant.profession.toLowerCase().includes('engineer')
      ) {
        score += 3;
      }

      // Clamp match percentage between 65% and 98%
      const matchPercentage = Math.min(98, Math.max(65, Math.round(score)));

      return {
        ...tenant,
        compatibility: matchPercentage,
        matchPercentage,
        sharedInterests,
      };
    });

    // Rank in maximum match order (highest % match first)
    return scoredTenants.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  async saveGuestProfile(profileDto: any): Promise<RoommateProfile> {
    const profile = this.roommateProfileRepo.create({
      userId: profileDto.userId,
      propertyId: profileDto.propertyId || 1,
      name: profileDto.name,
      age: Number(profileDto.age) || 24,
      profession: profileDto.profession || 'Working Professional',
      company: profileDto.company || 'Not Specified',
      sleepSchedule: profileDto.sleepSchedule || 'Flexible Schedule',
      cleanliness: profileDto.cleanliness || 'Moderate & Organized',
      foodHabit: profileDto.foodHabit || 'Flexible Diet',
      drinking: profileDto.drinking || 'Non-Drinker',
      smoking: profileDto.smoking || 'Non-Smoker',
      interests: Array.isArray(profileDto.interests) ? profileDto.interests : [],
      optedSmartMatch: profileDto.optedSmartMatch !== false,
      isTenant: false,
      selectedRoommateId: profileDto.selectedRoommateId || null,
      matchPercentage: profileDto.matchPercentage || null,
    });

    return this.roommateProfileRepo.save(profile);
  }
}
