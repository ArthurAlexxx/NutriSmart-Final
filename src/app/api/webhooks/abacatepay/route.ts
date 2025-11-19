
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

/**
 * Busca de forma flexível pelos metadados dentro do payload do evento.
 * @param {any} eventData O objeto de dados do evento do AbacatePay.
 * @returns Os metadados se encontrados, caso contrário, null.
 */
function findMetadata(eventData: any) {
    if (!eventData) return null;

    // Caminho 1: Padrão observado em billing.paid
    if (eventData.pixQrCode?.metadata) {
        return eventData.pixQrCode.metadata;
    }
    // Caminho 2: Metadados diretamente no objeto de dados
    if (eventData.metadata) {
        return eventData.metadata;
    }
    // Adicione outros caminhos possíveis aqui se forem descobertos
    // ex: if (eventData.charge?.metadata) return eventData.charge.metadata;

    return null;
}

async function handlePayment(event: any) {
    if (event.event !== 'billing.paid') {
        const message = `Evento não processado: ${event.event || 'desconhecido'}`;
        await saveWebhookLog(event, 'SUCCESS', message);
        return;
    }

    const metadata = findMetadata(event.data);

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

        try {
            await userRef.update({
                subscriptionStatus: newSubscriptionStatus,
            });

            const successMessage = `Assinatura do usuário ${userId} atualizada para ${newSubscriptionStatus}.`;
            console.log(successMessage);
            await saveWebhookLog(event, 'SUCCESS', successMessage);
        } catch (dbError: any) {
            const errorMessage = `Falha ao atualizar usuário ${userId} no banco de dados: ${dbError.message}`;
            console.error(errorMessage);
            await saveWebhookLog(event, 'FAILURE', errorMessage);
        }

    } else {
        const message = 'Metadados cruciais (externalId ou plan) não encontrados no payload do webhook.';
        console.warn(message, { payloadData: event.data });
        await saveWebhookLog(event, 'FAILURE', message);
    }
}

export async function POST(request: NextRequest) {
  let rawBody;
  try {
    rawBody = await request.text();
    
    const headerPayload = headers();
    const signature = headerPayload.get('x-webhook-signature');
    const webhookSecret = process.env.ABACATE_PAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('CRITICAL: ABACATE_PAY_WEBHOOK_SECRET não está configurado no ambiente.');
      return new NextResponse('Configuração de segurança do servidor incompleta.', { status: 500 });
    }

    if (!signature) {
       console.warn('Requisição de webhook recebida sem assinatura.');
       const receivedHeaders: { [key: string]: string } = {};
       headerPayload.forEach((value, key) => {
         receivedHeaders[key] = value;
       });
       console.log('Cabeçalhos recebidos:', JSON.stringify(receivedHeaders, null, 2));
      return new NextResponse('Assinatura do webhook ausente.', { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Assinatura de webhook inválida recebida.');
      return new NextResponse('Assinatura do webhook inválida.', { status: 403 });
    }
    
    const event = JSON.parse(rawBody);
    
    // Processa o pagamento em segundo plano para responder rapidamente.
    handlePayment(event).catch(err => {
      console.error("Erro no processamento do webhook em segundo plano:", err);
      saveWebhookLog(event, 'FAILURE', err.message || 'Erro desconhecido no processamento em segundo plano.');
    });

    // Retorna 200 OK imediatamente para o AbacatePay saber que recebemos.
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Erro fatal ao processar o webhook do AbacatePay:', error.message);
    let payloadForLog = {};
    try {
        if(rawBody) payloadForLog = JSON.parse(rawBody);
    } catch {
        payloadForLog = { error: "Could not parse raw body.", body: rawBody };
    }
    
    await saveWebhookLog(payloadForLog, 'FAILURE', `Erro de parsing ou inicial: ${error.message}`);
    
    // Responde com 200 para evitar que o AbacatePay fique tentando reenviar um payload malformado.
    return NextResponse.json({ error: 'Falha no processamento do webhook' }, { status: 200 });
  }
}

// Handler para GET para evitar erros de "Method Not Allowed" e fornecer feedback
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do AbacatePay. Use POST para enviar dados.' }, { status: 200 });
}
