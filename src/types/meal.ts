
// src/types/meal.ts
export interface Food {
  name: string;
  portion: number;
  unit: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
}

export interface Totals {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
}

export interface MealData {
  alimentos: Food[];
  totais: Totals;
  imageUrl?: string; // Optional field for the meal image URL
}

export interface MealEntry {
  id: string; 
  userId: string;
  date: string;
  mealType: string;
  mealData: MealData;
  createdAt: any; 
}
