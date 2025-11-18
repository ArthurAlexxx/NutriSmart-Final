
'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import {
  RecipeSchema,
  type Recipe,
  AnalyzeMealOutputSchema,
  type AnalyzeMealOutput,
  type AnalyzeMealInput,
  GeneratedPlan,
  type GeneratePlanInput,
} from '@/lib/ai-schemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT_JSON_ONLY = "Você é uma engine de software e deve SEMPRE responder apenas com um objeto JSON válido, sem nenhum texto, explicação ou formatação adicional.";

/**
 * Gera uma receita usando a API da OpenAI.
 * @param userInput - A string de entrada do usuário com ingredientes, tipo de prato, porções ou calorias.
 * @returns Um objeto de receita validado.
 */
export async function generateRecipeAction(userInput: string): Promise<Recipe> {
  const prompt = `
    CONTEXTO DO USUÁRIO:
    "${userInput}"

    INSTRUÇÕES:
    1. **Análise Inteligente**: Analise a solicitação para extrair ingredientes, tipo de prato, número de porções (ex: "para 2 pessoas"), metas calóricas (ex: "com 500 calorias") ou outras preferências.
    2. **Validação de Validade Alimentar**: Se o input não contiver nenhum termo relacionado à culinária, retorne APENAS: {"error": "O item informado não parece ser um alimento."}.
    3. **Construção da Receita**: Crie **apenas 1 receita** que atenda à solicitação. Use principalmente os ingredientes fornecidos. Adicione apenas itens básicos (sal, pimenta, azeite) se indispensável.
    4. **Cálculo Nutricional**: Estime calorias, proteínas, carboidratos e gorduras **por porção**.
    5. **Apresentação**: Gere um título profissional, uma descrição curta e um modo de preparo em passos numerados. Os tempos e porções devem ser realistas.

    FORMATO DE SAÍDA ESPERADO:
    Sua resposta DEVE ser um objeto JSON com a seguinte estrutura: { title, description, prepTime, cookTime, servings, ingredients, instructions, nutrition: { calories, protein, carbs, fat } }.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar uma resposta. Tente novamente.');
  }

  try {
    const recipeJson = JSON.parse(resultText);
    
    // Check for custom error from the AI
    if (recipeJson.error) {
        throw new Error(recipeJson.error);
    }

    // Attempt to validate the root object first
    const rootValidation = RecipeSchema.safeParse(recipeJson);
    if (rootValidation.success) {
      return rootValidation.data;
    }

    // If root fails, check for a nested 'recipe' object
    if (recipeJson.recipe) {
      const nestedValidation = RecipeSchema.safeParse(recipeJson.recipe);
      if (nestedValidation.success) {
        return nestedValidation.data;
      }
    }
    
    console.error("Zod validation failed for both root and nested 'recipe' objects.", {
        rootError: (rootValidation as any).error,
        nestedError: recipeJson.recipe ? (RecipeSchema.safeParse(recipeJson.recipe) as any).error : "No nested object"
    });
    console.error("Received JSON:", resultText);
    throw new Error('A resposta da IA não corresponde ao formato de receita esperado.');

  } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Zod validation error in generateRecipeAction:", error.errors);
      } else {
        console.error("Error parsing or validating recipe JSON:", error);
      }
      console.error("Original JSON string from OpenAI:", resultText);
      throw new Error("A resposta da IA não estava no formato de receita esperado. Tente ser mais específico sobre os ingredientes.");
  }
}

/**
 * Gera um plano alimentar para um dia usando a API da OpenAI.
 * @param input - Os dados do usuário (metas, peso, etc.).
 * @returns Um objeto de plano alimentar validado.
 */
export async function generateMealPlanAction(input: GeneratePlanInput): Promise<GeneratedPlan> {
  const prompt = `
    DADOS DO USUÁRIO PARA O PLANO:
    - Meta Calórica Diária: ${input.calorieGoal} kcal
    - Meta de Proteína Diária: ${input.proteinGoal} g
    - Meta de Hidratação Diária: ${input.hydrationGoal} ml
    - Peso Atual: ${input.weight || 'Não informado'} kg
    - Peso Meta: ${input.targetWeight || 'Não informado'} kg
    - Data Meta: ${input.targetDate || 'Não informada'}

    REGRAS DE PROCESSAMENTO:
    1.  **CRIAR PLANO:** Gere um plano com 5 a 6 refeições (incluindo lanches) usando alimentos comuns no Brasil. Quantidades devem ser precisas (ex: 120g).
    2.  **AJUSTAR METAS:** Os valores 'calorieGoal' e 'proteinGoal' no JSON podem variar até 5% para mais ou para menos. 'hydrationGoal' deve ser mantido.
    3.  **NOME E HORÁRIOS:** Use nomes padrão ('Café da Manhã', etc.) e atribua horários lógicos ("HH:MM").
    
    EXEMPLO DE SAÍDA JSON VÁLIDA:
    {
      "calorieGoal": 1985,
      "proteinGoal": 155,
      "hydrationGoal": 2500,
      "meals": [
        { "name": "Café da Manhã", "time": "07:30", "items": "2 ovos mexidos, 1 fatia de pão integral com abacate." },
        { "name": "Almoço", "time": "13:00", "items": "150g de peito de frango grelhado, 100g de arroz integral, salada de folhas." }
      ]
    }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar um plano alimentar. Verifique suas metas e tente novamente.');
  }
  
  try {
    const planJson = JSON.parse(resultText);

    // Attempt to validate the root object first
    const rootValidation = GeneratedPlan.safeParse(planJson);
    if (rootValidation.success) {
        return rootValidation.data;
    }

    // If root fails, check for a nested 'plan' object
    if (planJson.plan) {
        const nestedValidation = GeneratedPlan.safeParse(planJson.plan);
        if (nestedValidation.success) {
            return nestedValidation.data;
        }
    }

    console.error("Zod validation failed for both root and nested 'plan' objects.", {
        rootError: (rootValidation as any).error,
        nestedError: planJson.plan ? (GeneratedPlan.safeParse(planJson.plan) as any).error : "No nested object"
    });
    console.error("Received JSON:", resultText);
    throw new Error('A resposta da IA não corresponde ao formato de plano esperado.');

  } catch (error: any) {
     if (error instanceof z.ZodError) {
        console.error("Zod validation error in generateMealPlanAction:", error.errors);
     } else if (error.message.includes('formato de plano')) {
        throw error;
     } else {
        console.error("Error parsing or validating plan JSON:", error);
     }
     console.error("Original JSON string from OpenAI:", resultText);
     throw new Error("A resposta da IA não estava no formato de plano esperado.");
  }
}

/**
 * Analyzes a meal from a photo using the OpenAI API.
 * @param input - The user's input containing the photo data URI and meal type.
 * @returns A validated meal analysis object.
 */
export async function analyzeMealFromPhotoAction(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
  const prompt = `
    INSTRUÇÕES PRINCIPAIS:

    1.  **Identificação Visual Avançada**: Identifique com precisão todos os alimentos e bebidas visíveis na imagem. Estime as quantidades de cada item (em gramas ou unidades) com base em proporções realistas.
    2.  **Cálculo Nutricional Preciso**: Calcule o total de **calorias (calories)**, **proteínas (protein)**, **carboidratos (carbs)** e **gorduras (fat)**. Os valores devem ser numéricos e podem ser decimais para máxima precisão (ex: 125.5).
    3.  **Descrição Objetiva**: Crie uma descrição curta listando os principais itens identificados (ex: "Bife grelhado com arroz branco, feijão e salada de alface.").
    4.  **Validação de Imagem (Regra Crítica)**: Se a imagem fornecida claramente **NÃO CONTÉM COMIDA**, retorne o seguinte JSON com valores zerados: { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "description": "" }.
    5.  **Contexto**: Use o tipo de refeição ("${input.mealType}") como contexto, mas baseie sua análise na imagem.

    FORMATO DE SAÍDA JSON ESPERADO:
    { "calories": number, "protein": number, "carbs": number, "fat": number, "description": string }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // Using the more powerful model for vision
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT_JSON_ONLY,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: input.photoDataUri,
              detail: "low",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 400,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu analisar a imagem. Tente uma foto mais nítida.');
  }

  try {
    const analysisJson = JSON.parse(resultText);
    const validatedAnalysis = AnalyzeMealOutputSchema.parse(analysisJson);
    return validatedAnalysis;
  } catch(error) {
     console.error("Erro ao fazer parse do JSON da análise ou validar com Zod:", error);
     console.error("JSON recebido da OpenAI:", resultText);
     throw new Error("A resposta da IA não estava no formato de análise esperado.");
  }
}
    
