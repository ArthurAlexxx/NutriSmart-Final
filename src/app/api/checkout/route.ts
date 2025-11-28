// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createCustomer } from '@/app/actions/checkout-actions';

// This API route is now simplified to only handle customer creation/retrieval.
export async function POST(request: NextRequest) {
  try {
    const { userId, customerData } = await request.json();

    if (!userId || !customerData) {
      return NextResponse.json({ message: 'UserID e dados do cliente são obrigatórios.' }, { status: 400 });
    }

    // A action foi renomeada para createCustomer, mas a lógica de chamada é a mesma
    const result = await createCustomer(userId, customerData);

    // O retorno de sucesso agora é o objeto do cliente, o que é ótimo para debug.
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('API Error in checkout route:', error);
    // Retorna a mensagem de erro da action para o cliente.
    return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
