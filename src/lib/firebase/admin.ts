// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura (idempotente)
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Em ambientes de produção e desenvolvimento modernos (como Vercel ou GCS),
  // as credenciais devem ser gerenciadas por variáveis de ambiente.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
      // Esta é a principal causa do erro. A variável de ambiente não foi configurada.
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida. Para corrigir: 1. Vá ao seu projeto no Firebase Console. 2. Acesse Configurações do Projeto -> Contas de Serviço. 3. Clique em "Gerar nova chave privada" e baixe o arquivo JSON. 4. Copie o CONTEÚDO COMPLETO do arquivo JSON e cole-o como o valor da variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY no seu ambiente de hospedagem.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("Falha crítica ao inicializar o Firebase Admin SDK:", error.message);
    // Lança um erro claro para facilitar a depuração.
    throw new Error('Erro ao inicializar o Firebase Admin. O valor em FIREBASE_SERVICE_ACCOUNT_KEY parece ser um JSON inválido. Verifique se você copiou o conteúdo completo do arquivo de chave de serviço.');
  }
}

const adminApp = initializeAdminApp();
const db = admin.firestore(adminApp);
const auth = admin.auth(adminApp);

export { db, auth };
