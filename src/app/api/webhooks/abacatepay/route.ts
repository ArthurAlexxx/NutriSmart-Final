// src/app/api/webhooks/abacatepay/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';
import * as crypto from 'crypto';
import { headers } from 'next/headers';
import { updateUserSubscriptionAction } from '@/app/actions/billing-actions';


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
            payload: payload || { info: 'Payload not available' },
            status: status,
            details: details,
            createdAt: new Date(),
        };
        // Use a Server Action which has the correct context to write to DB
        // This is a workaround for serverless environments where admin init can be tricky
        // For simplicity in this context, we will log to console and attempt DB write.
        console.log(`Webhook Log (${status}): ${details}`, logData);
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
function findMetadata(eventData: any): { externalId: string, plan: 'PREMIUM' | 'PROFISSIONAL' } | null {
    if (!eventData) return null;

    const potentialPaths = [
        eventData.pixQrCode?.metadata,
        eventData.charge?.metadata,
        eventData.metadata
    ];

    for (const path of potentialPaths) {
        if (path && path.externalId && path.plan) {
            return path;
        }
    }
    
    return null;
}

/**
 * Processa o evento de pagamento, atualizando o status da assinatura do usuário.
 */
async function handlePayment(event: any) {
    if (event.event !== 'billing.paid') {
        const message = `Evento não processado: ${event.event || 'desconhecido'}`;
        // Não salvamos log para eventos não processados para evitar poluição.
        console.log(message);
        return;
    }

    const metadata = findMetadata(event.data);
    
    if (metadata && metadata.externalId && metadata.plan) {
        const userId = metadata.externalId;
        const planName = metadata.plan;

        try {
            // Use the Server Action to update the user's subscription
            const updateResult = await updateUserSubscriptionAction(userId, planName);
            if (updateResult.success) {
                await saveWebhookLog(event, 'SUCCESS', updateResult.message);
            } else {
                throw new Error(updateResult.message);
            }
        } catch (dbError: any) {
            const errorMessage = `Falha ao atualizar usuário ${userId} via Server Action: ${dbError.message}`;
            console.error(errorMessage);
            await saveWebhookLog(event, 'FAILURE', errorMessage);
            // Re-throw a aposta para que a chamada de origem saiba que falhou
            throw new Error(errorMessage);
        }

    } else {
        const message = 'Metadados cruciais (externalId ou plan) não encontrados no payload do webhook.';
        console.warn(message, { payloadData: event.data });
        await saveWebhookLog(event, 'FAILURE', message);
        throw new Error(message);
    }
}

/**
 * Função principal para lidar com as requisições POST do webhook.
 */
export async function POST(request: NextRequest) {
  let rawBody;
  let event;
  try {
    rawBody = await request.text();
    event = JSON.parse(rawBody);
  } catch (error: any) {
      console.error('Erro fatal ao fazer parse do corpo do webhook:', error.message);
      return new NextResponse('Payload malformado.', { status: 400 });
  }

  // Camada 1: Validação do Secret na URL
  const webhookSecretFromEnv = process.env.ABACATE_PAY_WEBHOOK_SECRET;
  const webhookSecretFromUrl = request.nextUrl.searchParams.get('webhookSecret');
  
  if (!webhookSecretFromEnv) {
    console.error('CRITICAL: ABACATE_PAY_WEBHOOK_SECRET não está configurado no ambiente.');
    return new NextResponse('Configuração de segurança do servidor incompleta.', { status: 500 });
  }

  if (webhookSecretFromUrl !== webhookSecretFromEnv) {
      console.warn('Requisição de webhook recebida com secret inválido na URL.');
      return new NextResponse('Webhook secret inválido.', { status: 401 });
  }

  // Camada 2: Validação da Assinatura HMAC no Cabeçalho
  const headerPayload = headers();
  const signature = headerPayload.get('x-webhook-signature');
  
  if (!signature) {
     console.warn('Requisição de webhook recebida sem assinatura no cabeçalho.');
     await saveWebhookLog(event, 'FAILURE', 'Assinatura HMAC ausente no cabeçalho.');
     return new NextResponse('Assinatura do webhook ausente.', { status: 400 });
  }

  const isSignatureValid = verifyAbacateSignature(rawBody, signature);

  if (!isSignatureValid) {
    console.warn('Assinatura de webhook inválida recebida.');
    await saveWebhookLog(event, 'FAILURE', 'Assinatura HMAC inválida.');
    return new NextResponse('Assinatura do webhook inválida.', { status: 403 });
  }
    
  // Se ambas as validações passaram, processa o pagamento
  try {
      await handlePayment(event);
      // Retorna 200 OK imediatamente para o AbacatePay saber que recebemos.
      return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
      // Erros durante o handlePayment (ex: DB offline) são logados lá dentro.
      // Aqui, respondemos com 500 para sinalizar ao AbacatePay para tentar novamente mais tarde.
      console.error("Erro no processamento do webhook em segundo plano:", error);
      return new NextResponse('Erro interno ao processar o webhook.', { status: 500 });
  }
}

// Handler para GET para evitar erros de "Method Not Allowed" e fornecer feedback
export async function GET() {
    return NextResponse.json({ message: 'Endpoint de webhook do AbacatePay. Use POST para enviar dados.' }, { status: 200 });
}
