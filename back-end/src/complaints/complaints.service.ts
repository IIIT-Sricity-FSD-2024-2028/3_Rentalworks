import { Injectable, NotFoundException } from '@nestjs/common';
import { COMPLAINTS, getNextId, saveData } from '../data';
import { CreateComplaintDto, UpdateComplaintDto } from './complaints.dto';

@Injectable()
export class ComplaintsService {
  findAll() {
    return COMPLAINTS;
  }

  findOne(id: number) {
    const complaint = COMPLAINTS.find(c => c.id === id);
    if (!complaint) throw new NotFoundException(`Complaint with ID ${id} not found`);
    return complaint;
  }

  create(createComplaintDto: CreateComplaintDto) {
    const newComplaint = {
      id: getNextId('complaint'),
      ...createComplaintDto,
      status: 'open',
      reportedAt: new Date().toISOString().split('T')[0]
    };
    COMPLAINTS.push(newComplaint);
    saveData();
    return newComplaint;
  }

  update(id: number, updateComplaintDto: UpdateComplaintDto) {
    const idx = COMPLAINTS.findIndex(c => c.id === id);
    if (idx === -1) throw new NotFoundException(`Complaint with ID ${id} not found`);
    COMPLAINTS[idx] = { ...COMPLAINTS[idx], ...updateComplaintDto };
    saveData();
    return COMPLAINTS[idx];
  }

  remove(id: number) {
    const idx = COMPLAINTS.findIndex(c => c.id === id);
    if (idx === -1) throw new NotFoundException(`Complaint with ID ${id} not found`);
    const removed = COMPLAINTS.splice(idx, 1)[0];
    saveData();
    return removed;
  }
}
