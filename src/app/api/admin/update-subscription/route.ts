// src/app/api/admin/update-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateUserSubscriptionStatusAction } from '@/app/actions/user-actions';

export async function POST(request: NextRequest) {
  try {
    const { userId, newStatus } = await request.json();

    if (!userId || !newStatus) {
      return NextResponse.json({ message: 'UserID e NewStatus são obrigatórios.' }, { status: 400 });
    }

    // We can directly call the action here because the action itself reads the
    // Authorization header passed from the client-side fetch.
    const result = await updateUserSubscriptionStatusAction(userId, newStatus);

    if (result.success) {
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
      // Use a status that indicates a client-side error (like permission denied)
      return NextResponse.json({ message: result.message }, { status: 403 });
    }
  } catch (error: any) {
    console.error('API Error updating user subscription:', error);
    return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
