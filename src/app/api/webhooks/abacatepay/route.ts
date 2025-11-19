// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';
import { headers, ReadonlyHeaders } from 'next/headers';

// CONFIGURAÇÃO CRÍTICA: Garante que o Next.js não processe o corpo da requisição
// antes de nós, o que é essencial para a validação do webhook.
export const dynamic = 'force-dynamic';

// Chave pública HMAC fornecida pela documentação do AbacatePay.
const ABACATEPAY_PUBLIC_KEY = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";


/**
 * Salva um log do webhook no Firestore para auditoria e depuração.
 */
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
 * Verifica se a assinatura do webhook corresponde ao HMAC esperado.
 * Conforme a documentação do AbacatePay.
 * @param rawBody Corpo bruto da requisição em string.
 * @param signatureFromHeader A assinatura recebida de `X-Webhook-Signature`.
 * @returns true se a assinatura for válida, false caso contrário.
 */
function verifyAbacateSignature(rawBody: string, signatureFromHeader: string): boolean {
  try {
    const bodyBuffer = Buffer.from(rawBody, "utf8");

    const expectedSig = crypto
      .createHmac("sha256", ABACATEPAY_PUBLIC_KEY)
      .update(bodyBuffer)
      .digest("base64");

    const a = Buffer.from(expectedSig);
    const b = Buffer.from(signatureFromHeader);

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
}

/**
 * Busca de forma flexível pelos metadados dentro do payload do evento.
 */
function findMetadata(eventData: any) {
    if (!eventData) return null;
    // Caminho 1: Padrão observado em billing.paid para pixQrCode
    if (eventData.pixQrCode?.metadata) return eventData.pixQrCode.metadata;
    // Caminho 2: Padrão observado em 'charge'
    if (eventData.charge?.metadata) return eventData.charge.metadata;
    // Fallback
    if (eventData.metadata) return eventData.metadata;
    return null;
}

/**
 * Processa o evento de pagamento, atualizando o status da assinatura do usuário.
 */
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
            return;
        }

        try {
            await userRef.update({ subscriptionStatus: newSubscriptionStatus });
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

/**
 * Função principal para lidar com as requisições POST do webhook.
 */
export async function POST(request: NextRequest) {
  const webhookSecretFromEnv = process.env.ABACATE_PAY_WEBHOOK_SECRET;
  
  // 1. Validação do Secret na URL
  const webhookSecretFromUrl = request.nextUrl.searchParams.get('webhookSecret');
  
  if (!webhookSecretFromEnv) {
    console.error('CRITICAL: ABACATE_PAY_WEBHOOK_SECRET não está configurado no ambiente.');
    return new NextResponse('Configuração de segurança do servidor incompleta.', { status: 500 });
  }

  if (webhookSecretFromUrl !== webhookSecretFromEnv) {
      console.warn('Requisição de webhook recebida com secret inválido na URL.');
      return new NextResponse('Webhook secret inválido.', { status: 401 });
  }

  let rawBody;
  try {
    rawBody = await request.text();
    
    // 2. Validação da Assinatura HMAC no Cabeçalho
    const headerPayload = headers();
    // Normaliza para minúsculas para evitar problemas de case-sensitivity
    const signature = headerPayload.get('x-webhook-signature');
    
    if (!signature) {
       console.warn('Requisição de webhook recebida sem assinatura no cabeçalho.');
      return new NextResponse('Assinatura do webhook ausente.', { status: 400 });
    }

    const isSignatureValid = verifyAbacateSignature(rawBody, signature);

    if (!isSignatureValid) {
      console.warn('Assinatura de webhook inválida recebida.');
      await saveWebhookLog(JSON.parse(rawBody), 'FAILURE', 'Assinatura HMAC inválida.');
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
