
'use server';

import { db } from '@/lib/firebase/admin';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Totals, MealData, MealEntry } from '@/types/meal';
import { analyzeMealFromPhotoAction } from '@/app/actions/ai-actions';
import type { AnalyzeMealOutput } from '@/lib/ai-schemas';
import { getLocalDateString } from '@/lib/date-utils';

interface FoodItem {
  name: string;
  portion: number;
  unit: string;
}

interface AddMealFormData {
  mealType: string;
  foods: FoodItem[];
}

interface GetNutritionalInfoResult {
    error?: string;
    totals?: Totals;
    description?: string;
}

const defaultTotals: Totals = { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 };


/**
 * Analyzes a meal from a photo using OpenAI API.
 * @param photoDataUri The data URI of the photo to analyze.
 * @param mealType The type of meal (e.g., 'almoco').
 * @returns An object with the nutritional totals or an error.
 */
export async function getNutritionalInfoFromPhoto(photoDataUri: string, mealType: string): Promise<GetNutritionalInfoResult> {
  try {
    const result: AnalyzeMealOutput = await analyzeMealFromPhotoAction({ photoDataUri, mealType });

    const totals: Totals = {
      calorias: result.calories,
      proteinas: result.protein,
      carboidratos: result.carbs,
      gorduras: result.fat,
      fibras: 0, // The model does not yet return fiber
    };

    return { totals, description: result.description };
  } catch (error: any) {
    console.error("[getNutritionalInfoFromPhoto] Failed to analyze photo:", error);
    return {
      error: error.message || "A IA não conseguiu analisar a imagem. Tente novamente ou insira os dados manualmente.",
      totals: defaultTotals,
    };
  }
}

interface SaveAnalyzedMealInput {
    userId: string;
    mealType: string;
    totals: {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
    };
    description: string;
}

/**
 * Saves a meal entry analyzed by the live analysis feature.
 * @param input - The data from the analyzed meal.
 * @returns An object indicating success or failure.
 */
export async function saveAnalyzedMealAction(input: SaveAnalyzedMealInput): Promise<{ success: boolean; message: string }> {
    const { userId, mealType, totals, description } = input;

    if (!userId || !mealType || !totals) {
        return { success: false, message: "Dados insuficientes para salvar a refeição." };
    }

    try {
        const mealData: MealData = {
            alimentos: [{ 
                name: description, 
                portion: 1, 
                unit: 'un',
                calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0
            }],
            totais: {
                calorias: totals.calories,
                proteinas: totals.protein,
                carboidratos: totals.carbs,
                gorduras: totals.fat,
                fibras: 0
            },
        };

        const newMealEntry: Omit<MealEntry, 'id'> = {
            userId: userId,
            date: getLocalDateString(new Date()),
            mealType: mealType,
            mealData: mealData,
            createdAt: serverTimestamp(),
        };

        const mealEntriesRef = collection(db, 'users', userId, 'meal_entries');
        await addDoc(mealEntriesRef, newMealEntry);

        return { success: true, message: "Refeição salva com sucesso no seu diário." };

    } catch (error: any) {
        console.error("[saveAnalyzedMealAction] Failed to save meal:", error);
        return { success: false, message: error.message || "Ocorreu um erro ao salvar a refeição." };
    }
}
