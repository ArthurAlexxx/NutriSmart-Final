
'use server';
/**
 * @fileOverview Analyzes a meal from a photo using a Genkit flow.
 *
 * - analyzeMealFromPhoto - A function that handles the meal analysis process.
 * - AnalyzeMealInput - The input type for the analyzeMealFromPhoto function.
 * - AnalyzeMealOutput - The return type for the analyzeMealFromPhoto function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

export const AnalyzeMealInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  mealType: z
    .string()
    .describe('The type of meal, e.g., "Café da Manhã", "Almoço".'),
});
export type AnalyzeMealInput = z.infer<typeof AnalyzeMealInputSchema>;

export const AnalyzeMealOutputSchema = z.object({
  calories: z.coerce.number().catch(0).describe('Estimativa de calorias totais (kcal).'),
  protein: z.coerce.number().catch(0).describe('Estimativa de proteína total (g).'),
  carbs: z.coerce.number().catch(0).describe('Estimativa de carboidratos totais (g).'),
  fat: z.coerce.number().catch(0).describe('Estimativa de gordura total (g).'),
  description: z.string().catch('').describe('Descrição curta da refeição identificada.'),
});
export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export async function analyzeMealFromPhoto(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
    return analyzeMealFlow(input);
}


const prompt = ai.definePrompt({
  name: 'analyzeMealPrompt',
  input: {schema: AnalyzeMealInputSchema},
  output: {schema: AnalyzeMealOutputSchema},
  prompt: `
    INSTRUÇÕES:
    1.  Identifique os alimentos na imagem e estime as quantidades em gramas ou unidades.
    2.  Calcule o total de **calorias (calories)**, **proteínas (protein)**, **carboidratos (carbs)** e **gorduras (fat)**. Os valores podem ser decimais para precisão.
    3.  Crie uma descrição curta dos itens (ex: "Bife grelhado com arroz branco e feijão.").
    4.  Se a imagem **NÃO CONTÉM COMIDA**, retorne um JSON com todos os valores numéricos zerados e a descrição vazia.
    5.  Use o tipo de refeição ("{{mealType}}") como contexto, mas baseie sua análise na imagem.

    EXEMPLO DE SAÍDA JSON:
    { "calories": 550.5, "protein": 45.2, "carbs": 60.0, "fat": 15.8, "description": "Bife grelhado, arroz, feijão e salada." }
    
    AGORA, ANALISE A IMAGEM E GERE SOMENTE O OBJETO JSON FINAL.

    Foto: {{media url=photoDataUri}}
  `,
});

const analyzeMealFlow = ai.defineFlow(
  {
    name: 'analyzeMealFlow',
    inputSchema: AnalyzeMealInputSchema,
    outputSchema: AnalyzeMealOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
