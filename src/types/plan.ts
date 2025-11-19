
import { Timestamp } from "firebase/firestore";

// src/types/plan.ts
export interface MealPlanItem {
    id?: string;
    name: string;
    time: string;
    items: string;
}

export interface ActivePlan {
    name?: string; // Optional name for the plan
    meals: MealPlanItem[];
    hydrationGoal: number;
    calorieGoal: number;
    proteinGoal: number; 
    createdAt: Timestamp | { seconds: number; nanoseconds: number; };
}
