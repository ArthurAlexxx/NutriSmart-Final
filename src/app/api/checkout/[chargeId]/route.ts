// src/app/api/checkout/[chargeId]/route.ts
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { chargeId: string } }) {
  const chargeId = params.chargeId;
  const abacateApiKey = process.env.ABACATE_PAY_API_KEY;
  
  if (!chargeId) {
    return NextResponse.json({ error: 'ID da cobrança não fornecido.' }, { status: 400 });
  }
  
  if (!abacateApiKey) {
    console.error('ABACATE_PAY_API_KEY não está configurada no servidor.');
    return NextResponse.json({ error: 'O gateway de pagamento não está configurado corretamente.' }, { status: 500 });
  }

  try {
    const abacateApiUrl = `https://api.abacatepay.com/v1/pixQrCode/check?id=${chargeId}`;
    const response = await fetch(abacateApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacateApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Garante que a verificação sempre busque o status mais recente
    });

    const data = await response.json();

    if (!response.ok || data.error) {
       const errorMessage = data.error?.message || data.error || 'Erro ao comunicar com o gateway de pagamento.';
       console.error(`AbacatePay API Error for chargeId ${chargeId}:`, errorMessage);
       throw new Error(errorMessage);
    }
    
    // A API de /check retorna um objeto `data` com o status.
    const status = data.data?.status;

    if (status === 'PAID') {
        // A rota de verificação manual NÃO deve atualizar o banco.
        // Ela apenas confirma o status para o frontend.
        // O webhook é a única fonte de verdade para a atualização do banco de dados.
        return NextResponse.json({ status: 'PAID' });
    }

    // Se o status não for 'PAID', retorna 'PENDING'
    return NextResponse.json({ status: 'PENDING' });

  } catch (error: any) {
    console.error(`Error checking payment status for chargeId ${chargeId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
