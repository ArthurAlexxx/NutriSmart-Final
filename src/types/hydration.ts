// src/types/hydration.ts

export interface HydrationEntry {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    intake: number; // in ml
    goal: number; // in ml
}
