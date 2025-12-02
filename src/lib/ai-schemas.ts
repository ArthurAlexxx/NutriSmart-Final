
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
export const FoodItemAnalysisSchema = z.object({
  food: z.string().describe("Nome do alimento identificado, ex: 'Arroz branco'."),
  quantity: z.string().describe("Quantidade estimada do alimento, ex: '100g'."),
});

export const AnalyzeMealOutputSchema = z.object({
  calories: z.coerce.number().catch(0).describe('Estimativa de calorias totais (kcal).'),
  protein: z.coerce.number().catch(0).describe('Estimativa de proteína total (g).'),
  carbs: z.coerce.number().catch(0).describe('Estimativa de carboidratos totais (g).'),
  fat: z.coerce.number().catch(0).describe('Estimativa de gordura total (g).'),
  description: z.string().catch('').describe('Descrição geral da refeição em uma única frase.'),
  rating: z.coerce.number().min(0).max(10).catch(5).describe('Nota de 0 a 10 sobre quão saudável é a refeição.'),
  ratingJustification: z.string().catch('').describe('Justificativa curta para a nota de saudabilidade.'),
  identifiedFoods: z.array(FoodItemAnalysisSchema).catch([]).describe('Lista dos alimentos individuais identificados com suas quantidades.'),
});


export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export interface AnalyzeMealInput {
    photoDataUri: string;
    mealType: string;
}

export const AnalyzeMealFromTextInputSchema = z.object({
  mealType: z.string(),
  textDescription: z.string(),
});

export type AnalyzeMealFromTextInput = z.infer<typeof AnalyzeMealFromTextInputSchema>;


const MealPlanItemSchema = z.object({
  name: z.string().describe("Tipo da refeição (ex: Café da Manhã, Almoço, Jantar)."),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)').describe("Horário da refeição no formato HH:MM."),
  items: z.string().describe("Descrição dos alimentos e quantidades para a refeição."),
});

const DailyPlanSchema = z.object({
  day: z.string().describe("O dia do plano, ex: 'Dia 1', 'Dia 2'."),
  date: z.string().describe("A data do plano no formato YYYY-MM-DD."),
  meals: z.array(MealPlanItemSchema).describe("Lista de refeições para este dia."),
});

export const GeneratedPlan = z.object({
  name: z.string().describe("Nome geral do plano, ex: 'Plano de 7 Dias para Perda de Peso'."),
  calorieGoal: z.coerce.number().describe("A meta de calorias diária recalculada para o plano."),
  proteinGoal: z.coerce.number().describe("A meta de proteínas diária recalculada para o plano."),
  hydrationGoal: z.coerce.number().describe("A meta de hidratação diária recalculada para o plano."),
  dailyPlans: z.array(DailyPlanSchema).describe("Um array de planos diários, um para cada dia solicitado."),
});

export type GeneratedPlan = z.infer<typeof GeneratedPlan>;

export const GeneratePlanInputSchema = z.object({
    durationInDays: z.number().min(1).max(7),
    weight: z.number().optional(),
    targetWeight: z.number().optional(),
    height: z.number().optional(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female']).optional(),
    activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    preferences: z.string().optional(),
});

export type GeneratePlanInput = z.infer<typeof GeneratePlanInputSchema>;


// Schema for Analysis Insights
const MealEntryForAISchema = z.object({
  date: z.string(),
  mealType: z.string(),
  mealData: z.object({
    totais: z.object({
      calorias: z.number(),
      proteinas: z.number(),
    }),
  }),
});

export const AnalysisInsightsInputSchema = z.object({
  period: z.number(),
  goals: z.object({
    calories: z.number(),
    protein: z.number(),
  }),
  meals: z.array(MealEntryForAISchema),
});

export type AnalysisInsightsInput = z.infer<typeof AnalysisInsightsInputSchema>;

export const AnalysisInsightsOutputSchema = z.object({
  insights: z.array(z.string()).describe("Um array de 3 a 5 strings, onde cada string é um insight nutricional para o usuário."),
});

export type AnalysisInsightsOutput = z.infer<typeof AnalysisInsightsOutputSchema>;

// Schemas for Live Food Analysis
export const FoodAnalysisResultSchema = z.object({
  alimento: z.string().describe("O nome do alimento identificado."),
  calorias: z.number().describe("Estimativa de calorias (kcal) para a porção visível."),
  proteinas: z.number().describe("Estimativa de proteínas (g)."),
  carboidratos: z.number().describe("Estimativa de carboidratos (g)."),
  gorduras: z.number().describe("Estimativa de gorduras (g)."),
  confianca: z.number().min(0).max(100).describe("Nível de confiança da detecção (0-100%)."),
  box: z.object({
    x: z.number().describe("Coordenada X do canto superior esquerdo da caixa (de 0 a 1)."),
    y: z.number().describe("Coordenada Y do canto superior esquerdo da caixa (de 0 a 1)."),
    width: z.number().describe("Largura da caixa (de 0 a 1)."),
    height: z.number().describe("Altura da caixa (de 0 a 1)."),
  }).describe("Caixa delimitadora do alimento na imagem."),
});

export const FrameAnalysisOutputSchema = z.object({
  items: z.array(FoodAnalysisResultSchema),
});

export type FrameAnalysisOutput = z.infer<typeof FrameAnalysisOutputSchema>;

export interface FrameAnalysisInput {
  frameDataUri: string;
}
