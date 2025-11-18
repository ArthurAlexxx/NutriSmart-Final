// src/types/user.ts
import { Timestamp } from "firebase/firestore";

export interface MealPlanItem {
    id?: string;
    name: string;
    time: string;
    items: string;
}

export interface ActivePlan {
    meals: MealPlanItem[];
    hydrationGoal: number;
    calorieGoal: number;
    proteinGoal: number; 
    createdAt: Timestamp | { seconds: number; nanoseconds: number; };
}

export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number; }; // Allow both server and client side timestamp
    
    // Simplified Role System
    profileType?: 'patient' | 'professional';
    role?: 'professional' | 'patient';
    
    // Connection fields
    dashboardShareCode?: string;
    patientRoomId?: string;
    professionalRoomIds?: string[];

    // Health Goal fields
    weight?: number;
    targetWeight?: number;
    targetDate?: Timestamp | Date;
    calorieGoal?: number;
    proteinGoal?: number;
    waterGoal?: number;
    activePlan?: ActivePlan;

    // Subscription fields
    subscriptionStatus?: 'premium' | 'free' | 'professional';

    // Feature usage tracking
    photoAnalysisCount?: number;
    lastPhotoAnalysisDate?: string; // YYYY-MM-DD
}
