
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
  AnalysisInsightsOutputSchema,
  type AnalysisInsightsOutput,
  type AnalysisInsightsInput,
  FrameAnalysisOutputSchema,
  type FrameAnalysisOutput,
  type FrameAnalysisInput,
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('O serviço de IA não está configurado no servidor.');
  }
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

  try {
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

    const recipeJson = JSON.parse(resultText);
    
    if (recipeJson.error) {
        throw new Error(recipeJson.error);
    }

    const validationResult = RecipeSchema.safeParse(recipeJson);
    if (validationResult.success) {
      return validationResult.data;
    } else {
        console.error("Zod validation failed for recipe object:", validationResult.error.errors);
        console.error("Received JSON from OpenAI:", resultText);
        throw new Error('A resposta da IA não corresponde ao formato de receita esperado. Tente ser mais específico sobre os ingredientes.');
    }

  } catch (error: any) {
      console.error("Error in generateRecipeAction:", error);
      let friendlyMessage = "Houve um problema ao se comunicar com o Chef Virtual. Por favor, tente novamente.";
      if (error.message.includes('A solicitação não parece ser sobre comida.')) {
          friendlyMessage = error.message;
      }
      throw new Error(friendlyMessage);
  }
}

/**
 * Gera um plano alimentar para um dia usando a API da OpenAI.
 * @param input - Os dados do usuário (metas, peso, etc.).
 * @returns Um objeto de plano alimentar validado.
 */
export async function generateMealPlanAction(input: GeneratePlanInput): Promise<GeneratedPlan> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('O serviço de IA não está configurado no servidor.');
    }
    const prompt = `
    VOCÊ É UM NUTRICIONISTA ESPECIALISTA em software e sua única função é gerar um plano alimentar diário em formato JSON.

    OBJETIVO: Criar um plano alimentar seguro, realista e eficaz com base nos dados do usuário.

    DADOS DO USUÁRIO PARA O PLANO:
    - Peso Atual: ${input.weight || 'Não informado'} kg
    - Altura: ${input.height || 'Não informada'} cm
    - Idade: ${input.age || 'Não informada'} anos
    - Gênero: ${input.gender || 'Não informado'}
    - Meta de Peso: ${input.targetWeight || 'Não informada'} kg
    - Data para Atingir a Meta: ${input.targetDate || 'Não informada'}
    - Nível de Atividade: ${input.activityLevel || 'moderado'}
    - Restrições Alimentares: ${input.dietaryRestrictions?.join(', ') || 'Nenhuma'}
    - Alergias: ${input.allergies?.join(', ') || 'Nenhuma'}
    - Preferências/Aversões: ${input.preferences || 'Nenhuma'}

    REGRAS DE PROCESSAMENTO (SIGA ESTRITAMENTE):
    1.  **Cálculo de Metas:** Primeiro, calcule as necessidades calóricas diárias (TMB + Nível de Atividade). Se houver meta de peso, crie um déficit/superávit calórico seguro para atingir a meta na data estipulada. Se não houver meta, crie um plano de manutenção.
    2.  **Definição dos Totais:** Sua resposta JSON **DEVE** incluir os campos \`calorieGoal\`, \`proteinGoal\`, e \`hydrationGoal\` com os totais calculados para o plano gerado. A meta de proteína deve ser aproximadamente 35% do total de calorias. A meta de hidratação deve ser 2500ml.
    3.  **Criação do Plano:** Crie um plano alimentar com 5 a 6 refeições (incluindo lanches). A soma dos nutrientes das refeições deve ser próxima às metas totais calculadas.
    4.  **Alimentos Comuns no Brasil:** Utilize alimentos comuns na mesa brasileira (arroz branco, feijão, peito de frango, carne moída, pão francês, batata, frutas como banana e maçã). Respeite TODAS as restrições e alergias.
    5.  **Quantidades Precisas:** Forneça quantidades precisas e realistas para cada item (ex: "120g de peito de frango grelhado", "80g de arroz integral", "1 concha de feijão").
    
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
        { "name": "Almoço", "time": "13:00", "items": "- 150g de peito de frango grelhado\\n- 100g de arroz branco\\n- 1 concha de feijão preto\\n- Salada de folhas verdes à vontade com azeite" },
        { "name": "Lanche da Tarde", "time": "16:30", "items": "- 1 pote de iogurte natural desnatado (170g)\\n- 1 colher de sopa de mel (15g)" },
        { "name": "Jantar", "time": "19:30", "items": "- 120g de filé de tilápia assado\\n- 150g de batata doce cozida\\n- Brócolis no vapor à vontade" },
        { "name": "Ceia", "time": "22:00", "items": "- 1 xícara de chá de camomila sem açúcar" }
      ]
    }

    AGORA, GERE SOMENTE O OBJETO JSON FINAL.
  `;
  try {
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
  
    const planJson = JSON.parse(resultText);
    const validationResult = GeneratedPlan.safeParse(planJson);

    if (validationResult.success) {
        return validationResult.data;
    } else {
        console.error("Zod validation failed:", validationResult.error);
        console.error("Received JSON:", resultText);
        throw new Error('A resposta da IA não corresponde ao formato de plano esperado.');
    }

  } catch (error: any) {
     console.error("Error in generateMealPlanAction:", error);
     throw new Error(error.message || "Houve um problema ao se comunicar com a IA para gerar o plano.");
  }
}

/**
 * Analyzes a meal from a photo using the OpenAI API.
 * @param input - The user's input containing the photo data URI and meal type.
 * @returns A validated meal analysis object.
 */
export async function analyzeMealFromPhotoAction(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('O serviço de IA não está configurado no servidor.');
  }
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

  try {
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

    const analysisJson = JSON.parse(resultText);
    const validationResult = AnalyzeMealOutputSchema.safeParse(analysisJson);

    if (validationResult.success) {
        return validationResult.data;
    } else {
        console.error("Zod validation error in analyzeMealFromPhotoAction:", validationResult.error.errors);
        console.error("Received JSON:", resultText);
        throw new Error("A resposta da IA não estava no formato de análise esperado.");
    }
  } catch(error: any) {
     console.error("Error in analyzeMealFromPhotoAction:", error);
     throw new Error(error.message || "Houve um problema ao se comunicar com a IA para analisar a foto.");
  }
}

/**
 * Generates nutritional insights based on user's meal data and goals.
 * @param input - The user's meal entries and goals for a specific period.
 * @returns A validated array of insights.
 */
export async function generateAnalysisInsightsAction(input: AnalysisInsightsInput): Promise<AnalysisInsightsOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('O serviço de IA não está configurado no servidor.');
  }
  const prompt = `
    Você é um nutricionista assistente de IA, especialista em analisar dados de consumo alimentar e fornecer insights práticos e motivacionais.

    OBJETIVO: Analisar os dados do usuário para o período de ${input.period} dias e gerar de 3 a 5 insights curtos e úteis.

    DADOS DO USUÁRIO:
    - Meta de Calorias Diária: ${input.goals.calories} kcal
    - Meta de Proteínas Diária: ${input.goals.protein} g
    - Refeições Registradas no Período:
    ${input.meals.map(m => `  - Dia: ${m.date}, Tipo: ${m.mealType}, Calorias: ${m.mealData.totais.calorias}, Proteínas: ${m.mealData.totais.proteinas}`).join('\n')}

    REGRAS DE ANÁLISE:
    1.  **Seja Positivo e Construtivo:** Comece com um ponto positivo, se possível. Evite linguagem de julgamento.
    2.  **Identifique Padrões:** Analise a consistência. O usuário atinge as metas? Há diferenças entre dias de semana e fins de semana? Algum tipo de refeição (ex: jantar) está consistentemente acima ou abaixo das metas?
    3.  **Seja Específico:** Use números para dar contexto. Ex: "Seu consumo de calorias nos fins de semana foi, em média, 20% maior." em vez de "Você come mais nos fins de semana."
    4.  **Dê Conselhos Acionáveis:** Cada insight negativo deve vir acompanhado de uma sugestão simples. Ex: "Para o lanche da tarde, tente trocar por uma opção rica em proteínas como iogurte grego para aumentar sua saciedade."
    5.  **Limite de Insights:** Gere entre 3 e 5 insights no máximo. Foque na qualidade, não na quantidade.
    6.  **Fale diretamente com o usuário:** Use "você", "sua jornada", etc.

    REGRAS DE SAÍDA (CRÍTICO):
    - Sua resposta DEVE SER APENAS o objeto JSON final.
    - O objeto deve conter uma única chave "insights", que é um array de strings.
    - Cada string no array é um insight.

    EXEMPLO DE SAÍDA JSON VÁLIDA:
    {
      "insights": [
        "Parabéns por atingir sua meta de proteína em 5 dos últimos 7 dias! Isso é ótimo para a manutenção da massa muscular.",
        "Notamos que sua ingestão de calorias é, em média, 300 kcal mais alta nos fins de semana. Que tal experimentar uma receita mais leve do nosso Chef Virtual no próximo sábado?",
        "Seu café da manhã tem sido consistentemente nutritivo e dentro das metas. Continue assim!",
        "Para atingir sua meta de hidratação mais facilmente, tente beber um copo de água antes de cada refeição principal."
      ]
    }

    AGORA, GERE SOMENTE O OBJETO JSON FINAL COM OS INSIGHTS.
  `;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const resultText = response.choices[0].message.content;
    if (!resultText) {
      throw new Error('A IA não conseguiu gerar os insights. Tente novamente mais tarde.');
    }

    const insightsJson = JSON.parse(resultText);
    const validationResult = AnalysisInsightsOutputSchema.safeParse(insightsJson);
    if (validationResult.success) {
      return validationResult.data;
    } else {
      console.error("Zod validation error in generateAnalysisInsightsAction:", validationResult.error.errors);
      console.error("Received JSON:", resultText);
      throw new Error('A resposta da IA não corresponde ao formato de insights esperado.');
    }
  } catch (error: any) {
    console.error("Error in generateAnalysisInsightsAction:", error);
    throw new Error(error.message || "Houve um problema ao se comunicar com a IA para gerar os insights.");
  }
}

/**
 * Analyzes a single frame from a video stream for food items.
 * @param input - The frame data URI.
 * @returns A validated object containing detected food items and their nutritional info.
 */
export async function analyzeFoodInFrameAction(input: FrameAnalysisInput): Promise<FrameAnalysisOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('O serviço de IA não está configurado no servidor.');
  }
  const prompt = `
    Você é um modelo de visão computacional treinado para nutrição. Sua única tarefa é analisar a imagem de um prato de comida e retornar uma lista de todos os alimentos identificados, com suas respectivas informações nutricionais e localização na imagem.

    REGRAS DE ANÁLISE E SAÍDA:
    1.  **DETECÇÃO MÚLTIPLA:** Identifique TODOS os itens alimentícios distintos na imagem.
    2.  **ESTIMATIVA DE NUTRIENTES:** Para cada item, estime a quantidade visível e calcule as **calorias (kcal)**, **proteínas (g)**, **carboidratos (g)** e **gorduras (g)**. Baseie-se em porções padrão se a quantidade exata for incerta.
    3.  **CAIXA DELIMITADORA (BOUNDING BOX):** Para cada item, forneça as coordenadas da caixa delimitadora. As coordenadas (x, y) representam o canto superior esquerdo e devem ser normalizadas (valores entre 0.0 e 1.0). A largura (width) e altura (height) também devem ser normalizadas.
    4.  **CONFIANÇA:** Atribua um nível de confiança (0-100) para cada detecção. Se não tiver certeza, use um valor mais baixo.
    5.  **FORMATO JSON ESTRITO:** Sua resposta deve ser APENAS o objeto JSON, seguindo o schema `FrameAnalysisOutputSchema`. A chave principal deve ser "items", que é um array de objetos. Não inclua nenhum texto antes ou depois do JSON.

    EXEMPLO DE SAÍDA JSON VÁLIDA:
    {
      "items": [
        {
          "alimento": "Filé de Salmão",
          "calorias": 280,
          "proteinas": 30,
          "carboidratos": 0,
          "gorduras": 18,
          "confianca": 98,
          "box": { "x": 0.2, "y": 0.3, "width": 0.6, "height": 0.3 }
        },
        {
          "alimento": "Brócolis",
          "calorias": 55,
          "proteinas": 4,
          "carboidratos": 11,
          "gorduras": 1,
          "confianca": 92,
          "box": { "x": 0.25, "y": 0.65, "width": 0.5, "height": 0.2 }
        }
      ]
    }
    
    Se a imagem não contiver comida, retorne um objeto com um array "items" vazio: \`{"items": []}\`.
    
    AGORA, ANALISE A IMAGEM E GERE SOMENTE O OBJETO JSON FINAL.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_JSON_ONLY },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: input.frameDataUri,
                detail: "low",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const resultText = response.choices[0].message.content;
    if (!resultText) {
      throw new Error('A IA não retornou uma análise. A imagem pode estar muito escura ou embaçada.');
    }

    const analysisJson = JSON.parse(resultText);
    const validationResult = FrameAnalysisOutputSchema.safeParse(analysisJson);

    if (validationResult.success) {
      return validationResult.data;
    } else {
      console.error("Zod validation error in analyzeFoodInFrameAction:", validationResult.error.errors);
      console.error("Received JSON:", resultText);
      throw new Error("A resposta da IA não corresponde ao formato de análise de frame esperado.");
    }
  } catch (error: any) {
    console.error("Error in analyzeFoodInFrameAction:", error);
    throw new Error(error.message || "Houve um problema ao se comunicar com a IA para analisar o frame.");
  }
}
