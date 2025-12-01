// src/app/api/admin/update-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateUserSubscriptionStatusAction } from '@/app/actions/user-actions';
import { auth as adminAuth, db } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) {
      return NextResponse.json({ message: 'Cabeçalho de autorização ausente.' }, { status: 401 });
    }

    const token = authorization.split('Bearer ')[1];
    if (!token) {
        return NextResponse.json({ message: 'Token de autorização ausente.' }, { status: 401 });
    }
  
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminUid = decodedToken.uid;
    
    const adminUserDoc = await db.collection('users').doc(adminUid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
      return NextResponse.json({ message: 'Ação não autorizada. Apenas administradores podem alterar assinaturas.' }, { status: 403 });
    }

    const { userId, newStatus } = await request.json();

    if (adminUid === userId) {
      return NextResponse.json({ message: 'Um administrador não pode alterar a própria assinatura.' }, { status: 403 });
    }

    if (!userId || !newStatus) {
      return NextResponse.json({ message: 'UserID e NewStatus são obrigatórios.' }, { status: 400 });
    }

    const result = await updateUserSubscriptionStatusAction(userId, newStatus);

    if (result.success) {
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API Error updating user subscription:', error);
     if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ message: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
    }
    return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
