// src/types/user.ts
import { Timestamp } from "firebase/firestore";

export interface MealPlanItem {
    id?: string;
    name: string;
    time: string;
    items: string;
}

export interface ActivePlan {
    id?: string; // Added for history tracking
    name?: string; // Optional name for the plan
    meals: MealPlanItem[];
    hydrationGoal: number;
    calorieGoal: number;
    proteinGoal: number;
    carbGoal?: number; // Adicionado
    fatGoal?: number; // Adicionado 
    createdAt: Timestamp | { seconds: number; nanoseconds: number; };
}

export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    photoURL?: string; // Add photoURL field
    createdAt: Timestamp;
    status?: 'active' | 'paused';
    profileType: 'patient' | 'professional';
    role: 'patient' | 'professional' | 'admin';
    theme?: 'light' | 'dark' | 'system';
    
    // Novos campos para pagamento
    phone?: string;
    taxId?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
    postalCode?: string;

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
    carbGoal?: number;
    fatGoal?: number;
    waterGoal?: number;

    subscriptionStatus?: 'premium' | 'free' | 'professional';
    subscriptionExpiresAt?: Timestamp | Date;
    asaasSubscriptionId?: string; // ID da assinatura no Asaas
    asaasCustomerId?: string; // ID do cliente no Asaas
    photoAnalysisCount?: number;
    lastPhotoAnalysisDate?: string; // YYYY-MM-DD
    
    unlockedAchievements?: string[]; // New field for achievements
    activePlan?: ActivePlan; // Adicionado para o perfil do paciente
}