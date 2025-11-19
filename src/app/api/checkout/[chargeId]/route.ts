// src/app/api/checkout/[chargeId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase/admin';

/**
 * Busca de forma flexível pelos metadados dentro da resposta da API de verificação.
 * @param {any} responseData O objeto de dados da API do AbacatePay.
 * @returns Os metadados se encontrados, caso contrário, null.
 */
function findMetadataInCheckResponse(responseData: any) {
    if (!responseData) return null;

    // Caminho 1: Padrão observado em webhook
    if (responseData.pixQrCode?.metadata) {
        return responseData.pixQrCode.metadata;
    }
    // Caminho 2: Metadados diretamente no objeto
    if (responseData.metadata) {
        return responseData.metadata;
    }
    // Adicione outros caminhos possíveis aqui se forem descobertos

    return null;
}

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
    
    // A API de /check retorna um objeto `data` com o status, não o payload completo.
    const status = data.data?.status;

    if (status === 'PAID') {
        // A rota de verificação manual NÃO deve atualizar o banco.
        // Ela apenas confirma o status para o frontend.
        // O webhook é a única fonte de verdade para a atualização.
        return NextResponse.json({ status: 'PAID' });
    }

    // Se o status não for 'PAID', retorna 'PENDING'
    return NextResponse.json({ status: 'PENDING' });

  } catch (error: any) {
    console.error(`Error checking payment status for chargeId ${chargeId}:`, error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
