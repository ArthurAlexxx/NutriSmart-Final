// src/types/user.ts
import { Timestamp } from "firebase/firestore";

export interface MealPlanItem {
    id?: string;
    name: string;
    time: string;
    items: string;
}

export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    createdAt: Timestamp | { seconds: number; nanoseconds: number; };
    status?: 'active' | 'paused';
    
    // Novos campos para pagamento
    phone?: string;
    taxId?: string;

    dashboardShareCode?: string;
    patientRoomId?: string;
    professionalRoomIds?: string[];

    // Health Goal fields
    weight?: number;
    targetWeight?: number;
    targetDate?: Timestamp | Date;
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

    subscriptionStatus?: 'premium' | 'free' | 'professional';
    subscriptionExpiresAt?: Timestamp | { seconds: number; nanoseconds: number; };
    photoAnalysisCount?: number;
    lastPhotoAnalysisDate?: string; // YYYY-MM-DD
    
    unlockedAchievements?: string[]; // New field for achievements
}
