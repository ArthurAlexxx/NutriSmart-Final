// src/app/api/user/delete/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { deleteAccountAction } from '@/app/actions/user-actions';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  
  if (!userId) {
    return NextResponse.json({ message: 'ID do usuário não fornecido.' }, { status: 400 });
  }
  
  // A action 'deleteAccountAction' já contém a lógica de verificação do token
  // e se o ID do usuário no token corresponde ao 'userId' fornecido.
  // Nós lemos o cabeçalho de autorização diretamente na action.
  const result = await deleteAccountAction(userId);

  if (result.success) {
    return NextResponse.json({ message: result.message }, { status: 200 });
  } else {
    // A mensagem de erro da action será mais específica (ex: 'Não autorizado' ou 'Erro interno')
    const statusCode = result.message.includes('Não autorizado') || result.message.includes('token') ? 403 : 500;
    return NextResponse.json({ message: result.message }, { status: statusCode });
  }
}
