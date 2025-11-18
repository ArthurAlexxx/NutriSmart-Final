
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
    
    if (recipeJson.error) {
        throw new Error(recipeJson.error);
    }

    const validationResult = RecipeSchema.safeParse(recipeJson);
    if (validationResult.success) {
      return validationResult.data;
    }
    
    console.error("Zod validation failed for recipe object.");
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
    VOCÊ É UM NUTRICIONISTA ESPECIALISTA em software e sua única função é gerar um plano alimentar diário em formato JSON.

    OBJETIVO: Criar um plano alimentar seguro, realista e eficaz com base nos dados do usuário.

    DADOS DO USUÁRIO PARA O PLANO:
    - Peso Atual: ${input.weight || 'Não informado'} kg
    - Altura: ${input.height || 'Não informada'} cm
    - Idade: ${input.age || 'Não informada'} anos
    - Gênero: ${input.gender || 'Não informado'}
    - Meta de Peso: ${input.targetWeight || 'Não informada'} kg
    - Nível de Atividade: ${input.activityLevel || 'moderado'}
    - Restrições Alimentares: ${input.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Alergias: ${input.allergies?.join(', ') || 'Nenhuma'}
    - Preferências/Aversões: ${input.preferences || 'Nenhuma'}
    - Orçamento: ${input.budget || 'moderado'}

    REGRAS DE PROCESSAMENTO (SIGA ESTRITAMENTE):
    1.  **Cálculo de Metas:** Primeiro, calcule as necessidades calóricas diárias (TMB + Nível de Atividade). Crie um déficit calórico seguro (se a meta for perder peso) ou um superávit (se for ganhar peso).
    2.  **Distribuição de Macros:** Distribua os macronutrientes de forma equilibrada (ex: 40% carboidratos, 30% proteínas, 30% gorduras), ajustando conforme o objetivo.
    3.  **Criação do Plano:** Crie um plano alimentar com 5 a 6 refeições (incluindo lanches) usando alimentos comuns no Brasil, respeitando o orçamento e TODAS as restrições e alergias.
    4.  **Quantidades Precisas:** Forneça quantidades precisas e realistas para cada item (ex: "120g de peito de frango grelhado", "80g de arroz integral", "1 concha de feijão").
    5.  **Hidratação:** Defina uma meta de hidratação razoável, geralmente entre 2000-3000ml.

    REGRAS DE SAÍDA (CRÍTICO):
    - Sua resposta DEVE SER APENAS o objeto JSON final, sem nenhum texto antes ou depois.
    - O JSON deve ser estritamente validado pelo schema abaixo.

    EXEMPLO DE SAÍDA JSON VÁLIDA:
    {
      "calorieGoal": 1985,
      "proteinGoal": 155,
      "hydrationGoal": 2500,
      "meals": [
        { "name": "Café da Manhã", "time": "07:30", "items": "- 3 ovos mexidos com tomate e orégano\\n- 1 fatia de pão integral (40g)\\n- 1/2 abacate (60g)" },
        { "name": "Lanche da Manhã", "time": "10:30", "items": "- 1 maçã média (150g)\\n- 20g de amêndoas" },
        { "name": "Almoço", "time": "13:00", "items": "- 150g de peito de frango grelhado\\n- 100g de arroz integral cozido\\n- 1 concha de feijão preto\\n- Salada de folhas verdes à vontade com azeite" },
        { "name": "Lanche da Tarde", "time": "16:30", "items": "- 1 pote de iogurte natural desnatado (170g)\\n- 1 colher de sopa de mel (15g)" },
        { "name": "Jantar", "time": "19:30", "items": "- 120g de filé de tilápia assado\\n- 150g de batata doce cozida\\n- Brócolis no vapor à vontade" },
        { "name": "Ceia", "time": "22:00", "items": "- 1 xícara de chá de camomila sem açúcar" }
      ]
    }

    AGORA, GERE SOMENTE O OBJETO JSON FINAL.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const resultText = response.choices[0].message.content;
  if (!resultText) {
    throw new Error('A IA não conseguiu gerar um plano alimentar. Verifique suas metas e tente novamente.');
  }
  
  try {
    const planJson = JSON.parse(resultText);

    const validationResult = GeneratedPlan.safeParse(planJson);
    if (validationResult.success) {
        return validationResult.data;
    }

    console.error("Zod validation failed:", validationResult.error);
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
    
    const validationResult = AnalyzeMealOutputSchema.safeParse(analysisJson);

    if (validationResult.success) {
        return validationResult.data;
    } else {
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
    
