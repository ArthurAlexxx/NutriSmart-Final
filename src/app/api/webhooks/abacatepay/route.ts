
// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';
import { headers } from 'next/headers';

// CONFIGURAÇÃO CRÍTICA: Garante que o Next.js não processe o corpo da requisição
// antes de nós, o que é essencial para a validação do webhook.
export const dynamic = 'force-dynamic';

async function saveWebhookLog(payload: any, status: 'SUCCESS' | 'FAILURE', details: string) {
    try {
        const logData = {
            payload: payload,
            status: status,
            details: details,
            createdAt: new Date(),
        };
        // Esta operação não é aguardada para responder rapidamente ao webhook.
        await db.collection('webhook_logs').add(logData);
    } catch (logError: any) {
        console.error("CRITICAL: Failed to save webhook log.", logError.message);
    }
}

async function handlePayment(event: any) {
    if (event.event === 'billing.paid' && event.data?.pixQrCode) {
      const charge = event.data.pixQrCode;
      const metadata = charge.metadata;

      if (metadata && metadata.externalId && metadata.plan) {
        const userId = metadata.externalId;
        const planName = metadata.plan;
        const userRef = db.collection('users').doc(userId);

        let newSubscriptionStatus: 'premium' | 'professional' | 'free' = 'free';

        if (planName === 'PREMIUM') {
            newSubscriptionStatus = 'premium';
        } else if (planName === 'PROFISSIONAL') {
            newSubscriptionStatus = 'professional';
        } else {
          const message = `Plano desconhecido "${planName}" no webhook para o usuário ${userId}.`;
          console.warn(message);
          await saveWebhookLog(event, 'FAILURE', message);
          return; // Para o processamento
        }

        await userRef.update({
          subscriptionStatus: newSubscriptionStatus,
        });

        const successMessage = `Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus}.`;
        console.log(successMessage);
        await saveWebhookLog(event, 'SUCCESS', successMessage);

      } else {
        const message = 'Metadados ausentes no webhook (externalId ou plan).';
        console.warn(message, metadata);
        await saveWebhookLog(event, 'FAILURE', message);
      }
    } else {
        const message = `Evento não processado: ${event.event}`;
        // Salva como sucesso porque recebemos, mesmo que não tenhamos uma ação para ele.
        await saveWebhookLog(event, 'SUCCESS', message);
    }
}

export async function POST(request: NextRequest) {
  let rawBody;
  try {
    // 1. LER O CORPO BRUTO (RAW BODY)
    // Isso é crucial. request.json() iria quebrar a verificação da assinatura.
    rawBody = await request.text();
    
    const signature = headers().get('abacate-signature');
    const webhookSecret = process.env.ABACATE_PAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('ABACATE_PAY_WEBHOOK_SECRET não está configurado.');
      return new NextResponse('Configuração de segurança do servidor incompleta.', { status: 500 });
    }

    if (!signature) {
      console.warn('Requisição de webhook recebida sem assinatura.');
      return new NextResponse('Assinatura do webhook ausente.', { status: 400 });
    }

    // 2. VALIDAR A ASSINATURA USANDO O CORPO BRUTO
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Assinatura de webhook inválida recebida.');
      return new NextResponse('Assinatura do webhook inválida.', { status: 403 });
    }
    
    // 3. PARSE DO JSON APENAS APÓS A VALIDAÇÃO
    const event = JSON.parse(rawBody);
    
    // --- Assinatura validada, agora podemos processar ---

    // Chame a função de processamento, mas não a aguarde (fire-and-forget).
    // Isso garante que retornemos uma resposta 200 OK imediatamente.
    handlePayment(event).catch(err => {
      console.error("Erro no processamento do webhook em segundo plano:", err);
      saveWebhookLog(event, 'FAILURE', err.message || 'Erro desconhecido no processamento em segundo plano.');
    });

    // 4. RETORNAR RESPOSTA DE SUCESSO IMEDIATAMENTE
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro fatal ao processar o webhook do AbacatePay:', error.message);
    let payloadForLog = {};
    try {
        if(rawBody) payloadForLog = JSON.parse(rawBody);
    } catch {
        payloadForLog = { error: "Could not parse raw body.", body: rawBody };
    }
    
    // Mesmo em caso de erro de parsing, é uma boa prática salvar o que recebemos.
    await saveWebhookLog(payloadForLog, 'FAILURE', `Erro de parsing ou inicial: ${error.message}`);
    
    // Retorna 200 para evitar que o AbacatePay tente reenviar uma requisição malformada.
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 200 });
  }
}

// Handler para GET para evitar erros de "Method Not Allowed" e fornecer feedback
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do AbacatePay. Use POST para enviar dados.' }, { status: 200 });
}
