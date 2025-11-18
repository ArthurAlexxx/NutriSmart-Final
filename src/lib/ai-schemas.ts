// src/lib/ai-schemas.ts
import { z } from 'zod';

// Esquema para a receita (usado pela Zod para validação)
export const RecipeSchema = z.object({
  title: z.string().describe("O título criativo e atraente da receita."),
  description: z.string().describe("Uma breve descrição da receita, com 2-3 frases."),
  prepTime: z.string().describe("O tempo de preparo, ex: '15 min'"),
  cookTime: z.string().describe("O tempo de cozimento, ex: '20 min'"),
  servings: z.string().describe("O número de porções que a receita rende, ex: '2'"),
  ingredients: z.array(z.string()).describe("Lista dos ingredientes necessários."),
  instructions: z.array(z.string()).describe("Lista dos passos para o modo de preparo."),
  nutrition: z.object({
    calories: z.string().describe("Total de calorias da receita, ex: '450 kcal'"),
    protein: z.string().describe("Total de proteínas da receita, ex: '30g'"),
    carbs: z.string().describe("Total de carboidratos da receita, ex: '25g'"),
    fat: z.string().describe("Total de gorduras da receita, ex: '15g'"),
  }).describe("Informações nutricionais da receita."),
});

export type Recipe = z.infer<typeof RecipeSchema>;


// Schema for meal analysis from a photo
export const AnalyzeMealOutputSchema = z.object({
  calories: z.coerce.number().catch(0).describe('Estimativa de calorias totais (kcal).'),
  protein: z.coerce.number().catch(0).describe('Estimativa de proteína total (g).'),
  carbs: z.coerce.number().catch(0).describe('Estimativa de carboidratos totais (g).'),
  fat: z.coerce.number().catch(0).describe('Estimativa de gordura total (g).'),
  description: z.string().catch('').describe('Descrição curta da refeição identificada.'),
});

export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export interface AnalyzeMealInput {
    photoDataUri: string;
    mealType: string;
}

const MealPlanItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().describe("Tipo da refeição (ex: Café da Manhã, Almoço, Jantar)."),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').describe("Horário da refeição no formato HH:MM."),
  items: z.string().describe("Descrição dos alimentos e quantidades para a refeição."),
});

export const GeneratedPlan = z.object({
  calorieGoal: z.coerce.number().describe("A meta de calorias diária recalculada para o plano."),
  proteinGoal: z.coerce.number().describe("A meta de proteínas diária recalculada para o plano."),
  hydrationGoal: z.coerce.number().describe("A meta de hidratação diária recalculada para o plano."),
  meals: z.array(MealPlanItemSchema).describe("Uma lista de refeições para um dia, totalizando 5 a 6 refeições (incluindo lanches)."),
});

export type GeneratedPlan = z.infer<typeof GeneratedPlan>;

export const GeneratePlanInputSchema = z.object({
    weight: z.number().optional(),
    targetWeight: z.number().optional(),
    height: z.number().optional(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female']).optional(),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    preferences: z.string().optional(),
    budget: z.enum(['economical', 'moderate', 'flexible']).optional(),
});

export type GeneratePlanInput = z.infer<typeof GeneratePlanInputSchema>;
