
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

/**
 * Gera uma receita usando a API da OpenAI.
 * @param userInput - A string de entrada do usuário com ingredientes, tipo de prato, porções ou calorias.
 * @returns Um objeto de receita validado.
 */
export async function generateRecipeAction(userInput: string): Promise<Recipe> {
  const prompt = `
    Você é um Sistema Culinário e Nutricional Avançado, com expertise profissional em gastronomia, tecnologia alimentar e nutrição clínica. Sua função é interpretar a solicitação do usuário, que pode conter ingredientes, tipo de prato, número de pessoas, metas calóricas ou outras preferências, e desenvolver uma receita altamente precisa, realista e tecnicamente estruturada.

    CONTEXTO DO USUÁRIO:
    "${userInput}"

    INSTRUÇÕES ESSENCIAIS (SIGA À RISCA):

    1. **Análise Inteligente da Solicitação**:
       - Analise a solicitação completa para extrair ingredientes, o prato desejado, o número de porções (ex: "para 2 pessoas"), metas calóricas (ex: "com 500 calorias") ou restrições (ex: "low-carb").
       - Se a solicitação não parecer relacionada a comida (ex: "qual a capital do Brasil?"), retorne o erro específico.

    2. **Validação de Validade Alimentar**
       - Se o input não contiver nenhum termo relacionado à culinária, retorne APENAS:
         {"error": "O item informado não parece ser um alimento."}

    3. **Construção da Receita Adaptativa**
       - Crie **apenas 1 receita** que atenda à solicitação.
       - Utilize principalmente os ingredientes fornecidos; acrescente apenas itens básicos (sal, pimenta, alho, cebola, azeite) quando indispensáveis.
       - **Ajuste as quantidades e porções** para corresponder ao número de pessoas ou metas calóricas, se informado.
       - O preparo deve ser em *passos numerados*, concisos e tecnicamente claros.
       - O tempo de preparo, cozimento e o número de porções devem ser realistas e ajustados à solicitação.

    4. **Cálculo Nutricional Profissional**
       - Estime calorias, proteínas, carboidratos e gorduras **por porção** com a maior precisão possível, refletindo os ajustes feitos.

    5. **Apresentação Profissional**
       - Gere um título profissional e uma descrição objetiva, elegante e atrativa.

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
          "name": "Almoço",
          "time": "13:00",
          "items": "150g de peito de frango grelhado, 100g de arroz integral, salada de folhas verdes à vontade com 1 colher de sopa de azeite."
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
    Você é um Sistema Avançado de Análise Nutricional por Visão Computacional, especializado em avaliação precisa de alimentos a partir de imagens reais. Sua única função é retornar um objeto JSON com a análise.

    INSTRUÇÕES PRINCIPAIS:

    1.  **Identificação Visual Avançada**:
        - Identifique com precisão todos os alimentos e bebidas visíveis na imagem.
        - Estime as quantidades de cada item (em gramas ou unidades) com base em proporções realistas (ex: um bife médio tem ~150g, uma xícara de arroz tem ~180g).

    2.  **Cálculo Nutricional Científico**:
        - Com base nos itens e quantidades identificados, calcule o total de **calorias (calories)**, **proteínas (protein)**, **carboidratos (carbs)** e **gorduras (fat)**.
        - Os valores devem ser numéricos e podem ser decimais para máxima precisão (ex: 125.5).

    3.  **Descrição Objetiva da Refeição**:
        - Crie uma descrição curta e direta listando os principais itens identificados (ex: "Bife grelhado com arroz branco, feijão e salada de alface.").

    4.  **Validação de Imagem (Regra Crítica)**:
        - Se a imagem fornecida claramente **NÃO CONTÉM COMIDA** (ex: uma foto de uma caneta, uma paisagem, um carro), você **DEVE** retornar o seguinte JSON com valores zerados:
          {
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
            "description": ""
          }

    5.  **Contexto do Tipo de Refeição**:
        - Use a informação do usuário sobre o tipo de refeição ("${input.mealType}") como um contexto, mas sua análise deve se basear **primariamente na evidência visual** da foto.

    6.  **FORMATO DE SAÍDA ESTRITO E OBRIGATÓRIO**:
        - A resposta deve ser **EXCLUSIVAMENTE** um objeto JSON válido, sem nenhum texto, explicação ou caractere adicional antes ou depois.

        EXEMPLO DE SAÍDA JSON:
        {
          "calories": 550.5,
          "protein": 45.2,
          "carbs": 55.0,
          "fat": 15.8,
          "description": "Bife grelhado com arroz branco, feijão e salada de alface."
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

    