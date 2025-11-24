// src/app/api/admin/update-role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateUserRoleAction } from '@/app/actions/user-actions';

export async function POST(request: NextRequest) {
  try {
    const { userId, newRole } = await request.json();

    if (!userId || !newRole) {
      return NextResponse.json({ message: 'UserID e NewRole são obrigatórios.' }, { status: 400 });
    }

    const result = await updateUserRoleAction(userId, newRole);

    if (result.success) {
      return NextResponse.json({ message: result.message }, { status: 200 });
    } else {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }
  } catch (error: any) {
    console.error('API Error updating user role:', error);
    return NextResponse.json({ message: error.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
