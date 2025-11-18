
'use server';

import OpenAI from 'openai';
import { z } from 'zod';
import {
  RecipeSchema,
  type Recipe,
  AnalyzeMealOutputSchema,
  type AnalyzeMealOutput,
  type AnalyzeMealInput,
  PlanSchema,
  type GeneratedPlan,
  type GeneratePlanInput,
} from '@/lib/ai-schemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Gera uma receita usando a API da OpenAI.
 * @param userInput - A string de entrada do usuário com ingredientes ou tipo de prato.
 * @returns Um objeto de receita validado.
 */
export async function generateRecipeAction(userInput: string): Promise<Recipe> {
  const prompt = `
    Você é um Chef de Cozinha e Nutricionista virtual altamente qualificado e criativo. Sua especialidade é criar receitas deliciosas, saudáveis e fáceis de fazer com base nos ingredientes que o usuário tem disponível.

    A solicitação do usuário é: "${userInput}"

    Sua tarefa é criar UMA receita com base nessa solicitação. Siga estas regras estritamente:
    1.  **Validação de Alimento:** Antes de tudo, verifique se a solicitação do usuário contém ingredientes ou nomes de pratos reconhecíveis. Se o texto não parecer ser sobre comida (ex: "carro", "mesa", "livro"), sua única resposta deve ser um JSON com um campo 'error' contendo a mensagem "O item informado não parece ser um alimento.".
    2.  Use principalmente os ingredientes mencionados pelo usuário. Você pode adicionar ingredientes básicos como sal, pimenta, azeite, alho e cebola, se necessário.
    3.  O modo de preparo deve ser claro, conciso e dividido em passos numerados fáceis de seguir.
    4.  Forneça uma estimativa realista para o tempo de preparo, tempo de cozimento e número de porções.
    5.  Calcule uma estimativa aproximada dos valores nutricionais (calorias, proteínas, carboidratos, gorduras) para uma porção da receita.
    6.  Crie um título e uma descrição que sejam atraentes e que despertem o apetite.
    7.  **IMPORTANTE**: Sua resposta DEVE SER APENAS o objeto JSON, sem nenhum texto adicional, markdown, explicações ou qualquer outro tipo de mídia como imagens. Apenas texto.

    Responda em formato JSON estrito, seguindo exatamente o schema Zod abaixo. Não inclua NENHUM texto ou formatação fora do objeto JSON.
    \`\`\`json
    ${JSON.stringify(RecipeSchema.shape, null, 2)}
    \`\`\`
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
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
    
    const validatedRecipe = RecipeSchema.parse(recipeJson);
    return validatedRecipe;
  } catch (error) {
      console.error("Erro ao fazer parse do JSON da receita ou validar com Zod:", error);
      console.error("JSON recebido da OpenAI:", resultText);
      if (error instanceof Error && error.message.includes("alimento")) {
          throw error;
      }
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
    Você é um Nutricionista Esportivo e Chef de Cozinha especialista em criar planos alimentares otimizados e práticos.

    Sua tarefa é criar um plano alimentar para UM DIA, baseado nas metas e dados do usuário.

    Dados do Usuário:
    - Meta de Calorias: ${input.calorieGoal} kcal
    - Meta de Proteínas: ${input.proteinGoal} g
    - Meta de Hidratação: ${input.hydrationGoal} ml
    - Peso Atual: ${input.weight || 'Não informado'} kg
    - Peso Meta: ${input.targetWeight || 'Não informado'} kg
    - Data Meta: ${input.targetDate || 'Não informada'}

    REGRAS OBRIGATÓRIAS:
    1.  **Estrutura do Plano:** O plano deve conter entre 5 e 6 refeições para um dia, incluindo café da manhã, lanche da manhã, almoço, lanche da tarde, jantar e, opcionalmente, uma ceia.
    2.  **Ajuste de Metas:** Você pode fazer pequenos ajustes (até 5%) nas metas de calorias e proteínas para que o plano seja realista e balanceado, mas o \`hydrationGoal\` deve ser mantido.
    3.  **Refeições Realistas:** Crie refeições com alimentos comuns no Brasil, que sejam fáceis de encontrar e preparar. Inclua quantidades (ex: 100g, 1 fatia, 2 colheres de sopa).
    4.  **Balanceamento:** Distribua as calorias e macronutrientes de forma inteligente ao longo do dia.
    5.  **Formato de Saída:** Responda em um formato JSON estrito, seguindo o schema fornecido. O objeto principal deve conter 'calorieGoal', 'proteinGoal', 'hydrationGoal' e 'meals'. Não inclua nenhuma formatação extra como markdown.

    Exemplo de uma refeição no array 'meals':
    {
      "name": "Almoço",
      "time": "12:30",
      "items": "150g de filé de frango grelhado\\n100g de arroz integral\\n1 concha de feijão carioca\\nSalada de alface e tomate à vontade com 1 colher de sopa de azeite"
    }
    
    Schema para o JSON:
    ${JSON.stringify(PlanSchema.shape)}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar um plano alimentar. Verifique suas metas e tente novamente.');
  }
  
  try {
    const planJson = JSON.parse(resultText);
    const validatedPlan = PlanSchema.parse(planJson);
    return validatedPlan;
  } catch (error) {
     console.error("Erro ao fazer parse do JSON do plano ou validar com Zod:", error);
     console.error("JSON recebido da OpenAI:", resultText);
     throw new Error("A resposta da IA não estava no formato de plano esperado.");
  }
}

/**
 * Analyzes a meal from a photo using the OpenAI API.
 * @param input - The user's input containing the photo data URI and meal type.
 * @returns A validated meal analysis object.
 */
export async function analyzeMealFromPhotoAction(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
  const prompt = `Analise a imagem da refeição e estime o conteúdo nutricional. O usuário marcou esta refeição como '${input.mealType}'.
Responda APENAS com um objeto JSON válido.
Se não for uma imagem de comida, retorne 0 para todos os valores numéricos e uma string vazia para a descrição.

O formato da resposta JSON DEVE ser:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "description": string
}

Exemplo de resposta para uma imagem de salada de frango:
{
  "calories": 350,
  "protein": 30,
  "carbs": 10,
  "fat": 20,
  "description": "Salada de frango com folhas verdes e tomate"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: input.photoDataUri,
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
