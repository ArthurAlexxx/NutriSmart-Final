// src/app/api/billing/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cancelSubscriptionAction } from '@/app/actions/billing-actions';
import { auth as adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Cabeçalho de autorização ausente.' }, { status: 401 });
  }

  const token = authorization.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ message: 'Token de autorização ausente.' }, { status: 401 });
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const result = await cancelSubscriptionAction(userId);

    if (result.success) {
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

  } catch (error: any) {
    console.error('API Error cancelling subscription:', error);
    let message = 'Falha ao cancelar a assinatura.';
    if (error.code === 'auth/id-token-expired') {
        message = 'Sessão expirada. Faça login novamente.';
    } else if (error.message) {
        message = error.message;
    }
    return NextResponse.json({ message }, { status: 500 });
  }
}
