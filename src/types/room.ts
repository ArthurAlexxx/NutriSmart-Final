// src/types/room.ts
import { Timestamp } from 'firebase/firestore';
import type { ActivePlan, MealPlanItem } from './user';

export interface PatientInfo {
    name: string;
    email: string;
    age?: number;
    weight?: number;
    targetWeight?: number;
    targetDate?: Timestamp | Date;
}

export interface Room {
    id: string;
    roomName: string;
    professionalId: string;
    patientId: string;
    patientInfo: PatientInfo;
    activePlan: ActivePlan;
    planHistory: ActivePlan[];
    createdAt: Timestamp;
    lastMessage?: {
      text: string;
      senderId: string;
      createdAt: Timestamp;
    };
    lastRead?: {
        [userId: string]: Timestamp;
    };
}
