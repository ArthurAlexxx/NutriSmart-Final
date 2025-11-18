// src/types/library.ts
import type { Timestamp } from 'firebase/firestore';

interface MealItem {
    name: string;
    time: string;
    items: string;
}

export interface PlanTemplate {
    id: string;
    name: string;
    description: string;
    calorieGoal: number;
    hydrationGoal: number;
    meals: MealItem[];
    createdAt: Timestamp;
}

export interface Guideline {
    id: string;
    title: string;
    content: string;
    createdAt: Timestamp;
}
