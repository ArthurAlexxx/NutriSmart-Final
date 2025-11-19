// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura (idempotente)
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Em ambientes de produção e desenvolvimento, as credenciais
  // devem ser gerenciadas por variáveis de ambiente.
  const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyBase64) {
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida. O valor deve ser a string codificada em base64 do seu arquivo de chave de serviço JSON.');
  }

  try {
    // Decodifica a string base64 para obter o JSON da chave de serviço.
    const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("Falha crítica ao inicializar o Firebase Admin SDK:", error.message);
    if (error instanceof SyntaxError) {
        throw new Error('Erro ao inicializar o Firebase Admin: O valor em FIREBASE_SERVICE_ACCOUNT_KEY parece não ser uma string base64 válida ou está corrompido.');
    }
    throw new Error('Erro desconhecido ao inicializar o Firebase Admin. Verifique a variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY.');
  }
}

const adminApp = initializeAdminApp();
const db = admin.firestore(adminApp);
const auth = admin.auth(adminApp);

export { db, auth };
