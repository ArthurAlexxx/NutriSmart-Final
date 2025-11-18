// src/types/weight.ts
import type { Timestamp } from 'firebase/firestore';

export interface WeightLog {
    id: string;
    userId: string;
    weight: number; // in kg
    date: string; // YYYY-MM-DD
    createdAt: Timestamp;
}
