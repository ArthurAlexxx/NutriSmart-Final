// src/app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createCustomer } from '@/app/actions/checkout-actions';

// This API route is now simplified to only handle customer creation/retrieval.
// The subscription creation logic is handled by the tokenizeCardAndCreateSubscription Server Action.
export async function POST(request: NextRequest) {
  try {
    const { userId, customerData } = await request.json();

    if (!userId || !customerData) {
      return NextResponse.json({ message: 'UserID e dados do cliente são obrigatórios.' }, { status: 400 });
    }

    const result = await createCustomer({ userId, customerData });

    if (result.success) {
      return NextResponse.json({ asaasCustomerId: result.asaasCustomerId }, { status: 200 });
    } else {
      return NextResponse.json({ message: result.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('API Error in checkout route:', error);
    return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
