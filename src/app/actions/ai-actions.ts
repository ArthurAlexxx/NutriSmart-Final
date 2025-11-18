
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

const SYSTEM_PROMPT_JSON_ONLY = `
VOCÊ DEVE RESPONDER APENAS COM UM OBJETO JSON VÁLIDO.
NÃO ESCREVA NADA FORA DO JSON.
NÃO ESCREVA TEXTO ANTES OU DEPOIS.
`;

/**
 * Gera uma receita usando a API da OpenAI.
 * @param userInput - A string de entrada do usuário com ingredientes, tipo de prato, porções ou calorias.
 * @returns Um objeto de receita validado.
 */
export async function generateRecipeAction(userInput: string): Promise<Recipe> {
  const prompt = `
    INSTRUÇÕES MESTRE:
    Você é um Chef de Cozinha especialista e está criando uma receita para um livro digital. Sua resposta deve ser extremamente detalhada, clara e útil.

    1.  **ANÁLISE DA SOLICITAÇÃO:**
        *   Analise o pedido do usuário: "${userInput}".
        *   Identifique os ingredientes principais, o número de porções desejado (ex: "para 2 pessoas"), metas calóricas (ex: "com 500 calorias") e qualquer outra preferência (ex: "low-carb", "vegetariano").
        *   Adapte TODA a receita (quantidades, ingredientes, etc.) para atender a essas especificações.

    2.  **CRIAÇÃO DA RECEITA (SEJA DETALHISTA):**
        *   **Título:** Crie um nome atraente e descritivo.
        *   **Descrição:** Escreva uma descrição curta e convidativa que desperte o interesse em preparar o prato.
        *   **Ingredientes:** Liste TODOS os ingredientes com quantidades PRECISAS (ex: "200g de peito de frango", "1/2 cebola média picada", "1 colher de sopa de azeite de oliva extra virgem"). Não use descrições vagas como "um pouco de".
        *   **Modo de Preparo:** Forneça um passo a passo NUMERADO e DETALHADO. Em vez de "Tempere o frango", escreva algo como "1. Seque os filés de frango com papel toalha e tempere ambos os lados com sal, pimenta do reino e páprica doce.".
        *   **Informações Nutricionais:** Estime os valores totais POR PORÇÃO para calorias (kcal), proteínas (g), carboidratos (g) e gorduras (g).
        *   **Dicas do Chef (Opcional, mas recomendado):** Adicione 1 ou 2 dicas úteis, como sugestões de acompanhamento, variações de ingredientes ou técnicas para melhorar o prato. Você pode adicionar isso no final da lista de instruções.

    3.  **REGRAS DE SAÍDA:**
        *   Se o pedido do usuário não parecer ser sobre comida, sua resposta JSON deve conter apenas um campo: \`{"error": "A solicitação não parece ser sobre comida."}\`.
        *   Sua resposta final deve ser **APENAS O OBJETO JSON COMPLETO**. Não inclua nenhum texto antes ou depois do JSON.

    EXEMPLO DE SAÍDA JSON VÁLIDA PARA "risoto de cogumelos para 2 pessoas":
    {
      "title": "Risoto Cremoso de Cogumelos Funghi",
      "description": "Um risoto rico e aveludado, perfeito para um jantar especial. A combinação de cogumelos funghi secchi e parmesão fresco cria uma explosão de sabor umami.",
      "prepTime": "15 min",
      "cookTime": "30 min",
      "servings": "2",
      "ingredients": [
        "1 xícara (200g) de arroz arbóreo",
        "20g de cogumelos funghi secchi",
        "1/2 cebola média, bem picada",
        "2 dentes de alho picados",
        "1 litro de caldo de legumes quente",
        "1/2 xícara de vinho branco seco",
        "50g de queijo parmesão ralado na hora",
        "2 colheres de sopa de manteiga sem sal",
        "Azeite, sal e pimenta do reino a gosto"
      ],
      "instructions": [
        "1. Hidrate o funghi em 1 xícara de água quente por 15 minutos. Coe (reserve a água) e pique os cogumelos.",
        "2. Em uma panela, aqueça uma colher de manteiga com um fio de azeite. Refogue a cebola até ficar translúcida e adicione o alho, refogando por mais 1 minuto.",
        "3. Adicione o arroz e mexa bem por 2 minutos ('tostar' o arroz). Despeje o vinho branco e mexa até evaporar.",
        "4. Adicione a água do funghi reservada e os cogumelos picados. Comece a adicionar o caldo de legumes, uma concha por vez, mexendo sempre e esperando o líquido ser absorvido antes de adicionar a próxima.",
        "5. Continue este processo por cerca de 18-20 minutos, até o arroz estar al dente. Desligue o fogo.",
        "6. Finalize com o restante da manteiga e o queijo parmesão (mantecatura). Mexa vigorosamente para criar cremosidade. Ajuste o sal e a pimenta.",
        "7. Sirva imediatamente. Dica do Chef: adicione um fio de azeite trufado ao finalizar para um toque extra de sofisticação."
      ],
      "nutrition": { "calories": "550", "protein": "15g", "carbs": "70g", "fat": "20g" }
    }

    AGORA, GERE SOMENTE O OBJETO JSON FINAL.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar uma resposta. Tente novamente.');
  }

  try {
    const recipeJson = JSON.parse(resultText);
    
    // Check for explicit error from AI
    if (recipeJson.error) {
        throw new Error(recipeJson.error);
    }

    // Attempt 1: Validate the root object
    const rootValidation = RecipeSchema.safeParse(recipeJson);
    if (rootValidation.success) {
      return rootValidation.data;
    }

    // Attempt 2: Validate a nested "recipe" object
    if (recipeJson.recipe) {
      const nestedValidation = RecipeSchema.safeParse(recipeJson.recipe);
      if (nestedValidation.success) {
        return nestedValidation.data;
      }
    }
    
    // If both fail, throw a specific error
    console.error("Zod validation failed for both root and nested 'recipe' objects.");
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
    INSTRUÇÕES:
    1. Crie um plano alimentar com 5 a 6 refeições (incluindo lanches) usando alimentos comuns no Brasil, com quantidades precisas (ex: 120g).
    2. Os valores de 'calorieGoal' e 'proteinGoal' no JSON final podem variar até 5% das metas para se adequar ao plano. 'hydrationGoal' deve ser mantido.
    3. Use nomes padrão para as refeições (ex: 'Café da Manhã') e atribua horários lógicos ("HH:MM").
    
    DADOS DO USUÁRIO PARA O PLANO:
    - Meta Calórica Diária: ${input.calorieGoal} kcal
    - Meta de Proteína Diária: ${input.proteinGoal} g
    - Meta de Hidratação Diária: ${input.hydrationGoal} ml
    - Peso Atual: ${input.weight || 'Não informado'} kg
    - Peso Meta: ${input.targetWeight || 'Não informado'} kg
    - Data Meta: ${input.targetDate || 'Não informada'}

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

    AGORA, GERE SOMENTE O OBJETO JSON FINAL.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar um plano alimentar. Verifique suas metas e tente novamente.');
  }
  
  try {
    const planJson = JSON.parse(resultText);

    // Attempt 1: Validate the root object against the full plan schema
    const rootValidation = GeneratedPlan.safeParse(planJson);
    if (rootValidation.success) {
        return rootValidation.data;
    }

    // Attempt 2: Validate a nested "plan" object
    if (planJson.plan) {
        const nestedValidation = GeneratedPlan.safeParse(planJson.plan);
        if (nestedValidation.success) {
            return nestedValidation.data;
        }
    }

    // If both fail, throw a specific error
    console.error("Zod validation failed for both root and nested 'plan' objects.");
    console.error("Received JSON:", resultText);
    throw new Error('A resposta da IA não corresponde ao formato de plano esperado.');

  } catch (error: any) {
     if (error instanceof z.ZodError) {
        console.error("Zod validation error in generateMealPlanAction:", error.errors);
     } else if (error.message.includes('formato de plano')) {
        // Re-throw specific errors to be shown to the user
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
    INSTRUÇÕES:
    1.  Identifique os alimentos na imagem e estime as quantidades em gramas ou unidades.
    2.  Calcule o total de **calorias (calories)**, **proteínas (protein)**, **carboidratos (carbs)** e **gorduras (fat)**. Os valores podem ser decimais para precisão.
    3.  Crie uma descrição curta dos itens (ex: "Bife grelhado com arroz branco e feijão.").
    4.  Se a imagem **NÃO CONTÉM COMIDA**, retorne um JSON com todos os valores numéricos zerados e a descrição vazia.
    5.  Use o tipo de refeição ("${input.mealType}") como contexto, mas baseie sua análise na imagem.

    EXEMPLO DE SAÍDA JSON:
    { "calories": 550.5, "protein": 45.2, "carbs": 60.0, "fat": 15.8, "description": "Bife grelhado, arroz, feijão e salada." }
    
    AGORA, ANALISE A IMAGEM E GERE SOMENTE O OBJETO JSON FINAL.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
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
    temperature: 0.3,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu analisar a imagem. Tente uma foto mais nítida.');
  }

  try {
    const analysisJson = JSON.parse(resultText);
    
    // Using safeParse for robust validation
    const validationResult = AnalyzeMealOutputSchema.safeParse(analysisJson);

    if (validationResult.success) {
        return validationResult.data;
    } else {
        // Log the detailed error from Zod for debugging
        console.error("Zod validation error in analyzeMealFromPhotoAction:", validationResult.error.errors);
        console.error("Received JSON:", resultText);
        throw new Error("A resposta da IA não estava no formato de análise esperado.");
    }

  } catch(error) {
     if (error instanceof z.ZodError) {
        console.error("Zod validation error during parse:", error.errors);
     } else {
        console.error("Erro ao fazer parse do JSON da análise ou validar com Zod:", error);
     }
     console.error("JSON recebido da OpenAI:", resultText);
     throw new Error("A resposta da IA não estava no formato de análise esperado.");
  }
}
