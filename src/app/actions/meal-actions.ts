
'use server';

import OpenAI from 'openai';
import type { Totals } from '@/types/meal';
import { analyzeMealFromPhoto } from '@/app/ai/flows/analyze-meal-from-photo';
import type { AnalyzeMealOutput } from '@/app/ai/flows/analyze-meal-from-photo';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Esta Server Action se comunica com a API da OpenAI
 * para obter os dados nutricionais de uma refeição.
 * 
 * @param data - Os dados da refeição enviados pelo formulário.
 * @returns Um objeto com os totais nutricionais ou uma mensagem de erro.
 */
export async function getNutritionalInfo(data: AddMealFormData): Promise<GetNutritionalInfoResult> {
    
    if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key não configurada.");
        return { error: 'O serviço de IA não está configurado. A refeição será salva com valores padrão.', totals: defaultTotals };
    }

    try {
        const formattedFoods = data.foods.map(food => `${food.portion}${food.unit} de ${food.name}`).join(', ');
        
        const prompt = `
            Você é um assistente de nutrição altamente preciso. Sua tarefa é calcular as informações nutricionais totais para uma refeição descrita pelo usuário.

            Analise a seguinte lista de alimentos e porções:
            "${formattedFoods}"

            Calcule os totais de calorias (kcal), proteínas (g), carboidratos (g), gorduras (g) e fibras (g) para a refeição inteira.
            
            Responda em um formato JSON estrito, sem nenhuma formatação adicional ou texto explicativo. O objeto principal deve se chamar "resultado".

            Exemplo de saída para "100g de peito de frango e 150g de arroz branco":
            {
              "resultado": {
                "calorias_kcal": 350,
                "proteinas_g": 35,
                "carboidratos_g": 45,
                "gorduras_g": 3,
                "fibras_g": 1
              }
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        const resultText = response.choices[0].message.content;
        if (!resultText) {
            return { totals: defaultTotals, error: 'Não foi possível analisar os valores nutricionais. A refeição será salva com valores padrão.' };
        }

        const analysisResult = JSON.parse(resultText);

        const totals: Totals = {
            calorias: analysisResult.resultado.calorias_kcal || 0,
            proteinas: analysisResult.resultado.proteinas_g || 0,
            carboidratos: analysisResult.resultado.carboidratos_g || 0,
            gorduras: analysisResult.resultado.gorduras_g || 0,
            fibras: analysisResult.resultado.fibras_g || 0,
        };
        
        return { totals };

    } catch (error: any) {
        console.error("[getNutritionalInfo] Falha Crítica na Server Action:", error);
        return { error: error.message || 'Ocorreu um erro desconhecido ao processar sua refeição. A refeição será salva com valores padrão.', totals: defaultTotals };
    }
}

/**
 * Analyzes a meal from a photo using OpenAI API.
 * @param photoDataUri The data URI of the photo to analyze.
 * @param mealType The type of meal (e.g., 'almoco').
 * @returns An object with the nutritional totals or an error.
 */
export async function getNutritionalInfoFromPhoto(photoDataUri: string, mealType: string): Promise<GetNutritionalInfoResult> {
  try {
    const result: AnalyzeMealOutput = await analyzeMealFromPhoto({ photoDataUri, mealType });

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
    
