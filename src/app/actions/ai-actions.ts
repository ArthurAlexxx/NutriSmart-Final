
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
    Você é um Chef Virtual e Nutricionista, um agente de IA especialista em criar receitas deliciosas e nutricionalmente equilibradas. Sua função é interpretar a solicitação do usuário, que pode conter ingredientes, tipo de prato, número de pessoas, metas calóricas ou outras preferências, e desenvolver uma receita precisa e atraente.

    CONTEXTO DO USUÁRIO:
    "${userInput}"

    INSTRUÇÕES ESSENCIAIS:

    1. **Análise Inteligente da Solicitação**:
       - Analise a solicitação completa para extrair ingredientes, o prato desejado, o número de porções (ex: "para 2 pessoas"), metas calóricas (ex: "com 500 calorias") ou restrições (ex: "low-carb").
       - Se a solicitação não parecer relacionada a comida (ex: "qual a capital do Brasil?"), retorne o erro específico.

    2. **Validação de Alimento**:
       - Se o input não contiver nenhum termo relacionado à culinária, retorne APENAS:
         {"error": "O item informado não parece ser um alimento."}

    3. **Construção da Receita Adaptativa**:
       - Crie **apenas 1 receita** que atenda à solicitação.
       - Use os ingredientes fornecidos como base. Adicione itens básicos (sal, pimenta, azeite, etc.) apenas se essencial.
       - **Ajuste as quantidades e porções** para corresponder ao número de pessoas ou metas calóricas, se informado.
       - O preparo deve ser em *passos numerados*, claros e concisos.
       - O tempo de preparo, cozimento e o número de porções devem ser realistas e ajustados à solicitação.

    4. **Cálculo Nutricional Preciso**:
       - Estime calorias, proteínas, carboidratos e gorduras **por porção**, com a maior precisão possível, refletindo os ajustes feitos.

    5. **Apresentação Profissional**:
       - Crie um título profissional e uma descrição atrativa para a receita.

    6. **FORMATO DE SAÍDA OBRIGATÓRIO**:
       - A resposta deve ser SOMENTE um objeto JSON válido que siga o schema abaixo. Nenhum texto ou caractere adicional fora do JSON.
         ${JSON.stringify(RecipeSchema.shape, null, 2)}
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

    // Handle cases where the AI might wrap the response
    const dataToValidate = recipeJson.recipe || recipeJson;
    
    const validatedRecipe = RecipeSchema.parse(dataToValidate);
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
    Você é uma ENGINE de software nutricional. Sua única função é receber dados de um usuário e retornar um objeto JSON estrito com um plano alimentar diário, sem qualquer texto, explicação ou formatação adicional.

    DADOS DO USUÁRIO PARA O PLANO:
    - Meta Calórica Diária: ${input.calorieGoal} kcal
    - Meta de Proteína Diária: ${input.proteinGoal} g
    - Meta de Hidratação Diária: ${input.hydrationGoal} ml
    - Peso Atual: ${input.weight || 'Não informado'} kg
    - Peso Meta: ${input.targetWeight || 'Não informado'} kg
    - Data Meta: ${input.targetDate || 'Não informada'}

    REGRAS ESTRITAS DE PROCESSAMENTO:
    1.  **CRIAR PLANO:** Gere um plano com 5 a 6 refeições (incluindo lanches) usando alimentos comuns no Brasil. As quantidades devem ser precisas (ex: 120g, 1 unidade, 1 colher de sopa).
    2.  **AJUSTAR METAS:** Os valores finais de 'calorieGoal' e 'proteinGoal' no JSON podem ter uma variação de até 5% para mais ou para menos em relação às metas do usuário para garantir um plano funcional e realista. A 'hydrationGoal' deve ser mantida exatamente igual.
    3.  **NOME DAS REFEIÇÕES:** Use nomes padrão: 'Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'.
    4.  **HORÁRIOS:** Atribua horários lógicos para cada refeição no formato "HH:MM".
    5.  **SAÍDA FINAL:** A saída deve ser APENAS o código JSON. NENHUMA palavra antes ou depois.

    EXEMPLO DE SAÍDA JSON VÁLIDA:
    {
      "calorieGoal": 1985,
      "proteinGoal": 155,
      "hydrationGoal": 2500,
      "meals": [
        {
          "name": "Café da Manhã",
          "time": "07:30",
          "items": "2 ovos mexidos, 1 fatia de pão integral com abacate, 1/2 mamão papaia."
        },
        {
          "name": "Lanche da Manhã",
          "time": "10:00",
          "items": "1 pote de iogurte natural (170g) com 1 colher de sopa de aveia."
        },
        {
          "name": "Almoço",
          "time": "13:00",
          "items": "150g de peito de frango grelhado, 100g de arroz integral, salada de folhas verdes à vontade com 1 colher de sopa de azeite."
        },
        {
          "name": "Lanche da Tarde",
          "time": "16:00",
          "items": "1 maçã, 30g de mix de castanhas (nozes, amêndoas)."
        },
        {
          "name": "Jantar",
          "time": "19:30",
          "items": "Omelete com 2 ovos e queijo minas, salada de tomate e pepino."
        }
      ]
    }

    A RESPOSTA DEVE SER APENAS O CÓDIGO JSON. NENHUM TEXTO ADICIONAL.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar um plano alimentar. Verifique suas metas e tente novamente.');
  }
  
  try {
    const planJson = JSON.parse(resultText);

    const validationResult = PlanSchema.safeParse(planJson);
    if (validationResult.success) {
        const validatedPlan = GeneratedPlan.parse(validationResult.data);
        return validatedPlan;
    }

    if (planJson.plan) {
        const nestedValidationResult = PlanSchema.safeParse(planJson.plan);
        if (nestedValidationResult.success) {
            const validatedPlan = GeneratedPlan.parse(nestedValidationResult.data);
            return validatedPlan;
        }
    }

    console.error("Zod validation failed for root and nested 'plan' objects.");
    console.error("Received JSON:", resultText);
    throw new Error('A resposta da IA não corresponde ao formato de plano esperado.');

  } catch (error: any) {
     if (error.message.includes('formato de plano')) {
        throw error;
     }
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
  const prompt = `
    Você é um Sistema Avançado de Análise Nutricional por Visão Computacional, especializado em avaliação precisa de alimentos a partir de imagens reais.

    INSTRUÇÕES PRINCIPAIS:

    1. **Identificação Visual Avançada**
       - Identifique com precisão todos os alimentos presentes na imagem.
       - Estime quantidades aproximadas em gramas ou unidades com base em proporções realistas.

    2. **Cálculo Nutricional Científico**
       - Calcule calorias, proteínas, carboidratos e gorduras utilizando referências nutricionais padrão.
       - Os valores devem ser o mais próximos possível da realidade, podendo ser decimais para maior precisão.

    3. **Descrição da Refeição**
       - Crie uma descrição curta, objetiva e fiel ao conteúdo da foto.

    4. **Validação de Imagem**
       - Caso a imagem NÃO contenha alimentos, retorne:
         {
           "calories": 0,
           "protein": 0,
           "carbs": 0,
           "fat": 0,
           "description": ""
         }

    5. **Tipo de Refeição**
       - Leve em consideração a categoria informada pelo usuário ("${input.mealType}"), mas priorize a evidência visual.

    6. **FORMATO RÍGIDO**
       - Responda exclusivamente com um objeto JSON no formato:
         {
           "calories": number,
           "protein": number,
           "carbs": number,
           "fat": number,
           "description": string
         }

    Nenhum texto adicional deve ser incluído.
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
