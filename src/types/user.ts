
// src/types/user.ts
import { Timestamp } from "firebase/firestore";

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

export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number; };
    
    profileType?: 'patient' | 'professional';
    role?: 'professional' | 'patient';
    
    dashboardShareCode?: string;
    patientRoomId?: string;
    professionalRoomIds?: string[];

    // Health Goal fields
    weight?: number;
    targetWeight?: number;
    height?: number;
    age?: number;
    gender?: 'male' | 'female';
    activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
    dietaryRestrictions?: string[];
    allergies?: string[];
    preferences?: string;

    // These are derived/set by the active plan, not directly by user in goals
    calorieGoal?: number;
    proteinGoal?: number;
    waterGoal?: number;

    activePlan?: ActivePlan;

    subscriptionStatus?: 'premium' | 'free' | 'professional';
    photoAnalysisCount?: number;
    lastPhotoAnalysisDate?: string; // YYYY-MM-DD
}
