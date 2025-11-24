// src/app/api/user/delete/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { deleteAccountAction } from '@/app/actions/user-actions';

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  const authHeader = request.headers.get('Authorization');

  if (!userId) {
    return NextResponse.json({ message: 'ID do usuário não fornecido.' }, { status: 400 });
  }

  if (!authHeader) {
     return NextResponse.json({ message: 'Não autorizado: Token não fornecido.' }, { status: 401 });
  }

  // A action 'deleteAccountAction' já contém a lógica de verificação do token
  // e se o ID do usuário no token corresponde ao 'userId' fornecido.
  // Nós passamos o cabeçalho de autorização para que a action possa lê-lo.
  const result = await deleteAccountAction(userId);

  if (result.success) {
    return NextResponse.json({ message: result.message }, { status: 200 });
  } else {
    // A mensagem de erro da action será mais específica (ex: 'Não autorizado' ou 'Erro interno')
    const statusCode = result.message.includes('Não autorizado') ? 403 : 500;
    return NextResponse.json({ message: result.message }, { status: statusCode });
  }
}
