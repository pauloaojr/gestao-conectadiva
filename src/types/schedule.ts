
export interface TimeSlot {
  id: string;
  time: string;
  days: string[];
  status: 'available' | 'assigned';
  available: boolean;
  attendantId?: string;
  attendantName?: string;
}

export interface ScheduleAssignment {
  id: string;
  attendantId: string;
  attendantName: string;
  timeSlots: TimeSlot[];
}

export type ScheduleDay = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';

export const SCHEDULE_DAYS: ScheduleDay[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
