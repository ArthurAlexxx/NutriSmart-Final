// src/app/api/checkout/[chargeId]/route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { chargeId: string } }) {
  const chargeId = params.chargeId;
  const asaasApiKey = process.env.ASAAS_API_KEY;
  
  if (!chargeId) {
    return NextResponse.json({ error: 'ID da cobrança não fornecido.' }, { status: 400 });
  }
  
  if (!asaasApiKey) {
    console.error('ASAAS_API_KEY não está configurada no servidor.');
    return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  try {
    const asaasApiUrl = `https://www.asaas.com/api/v3/payments/${chargeId}`;
    const response = await fetch(asaasApiUrl, {
      method: 'GET',
      headers: {
        'access_token': asaasApiKey,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
       const errorMessage = data.errors?.[0]?.description || 'Erro ao comunicar com o gateway de pagamento.';
       console.error(`Asaas API Error for chargeId ${chargeId}:`, errorMessage);
       return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    const status = data.status; // e.g., PENDING, CONFIRMED, RECEIVED

    if (status === 'CONFIRMED' || status === 'RECEIVED') {
        return NextResponse.json({ status: 'PAID', chargeId: chargeId });
    }

    return NextResponse.json({ status: 'PENDING' });

  } catch (error: any) {
    console.error(`Error checking payment status for chargeId ${chargeId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
