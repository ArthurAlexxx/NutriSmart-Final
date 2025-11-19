// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

// Define a structure to hold our lazily initialized services
interface FirebaseAdminServices {
  app: App;
  auth: Auth;
  db: Firestore;
}

let services: FirebaseAdminServices | null = null;

function initializeAdminApp(): FirebaseAdminServices {
  // If already initialized, return the existing services
  if (services) {
    return services;
  }

  // If there are existing admin apps, use the first one. This handles hot-reloads in development.
  if (admin.apps.length > 0) {
    const app = admin.apps[0] as App;
    services = {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };
    return services;
  }
  
  const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyBase64) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida. O valor deve ser a string codificada em base64 do seu arquivo de chave de serviço JSON.');
  }

  try {
    const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    services = {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };
    return services;

  } catch (error: any) {
    console.error("Falha crítica ao inicializar o Firebase Admin SDK:", error.message);
    if (error instanceof SyntaxError) {
      throw new Error('Erro ao inicializar o Firebase Admin: O valor em FIREBASE_SERVICE_ACCOUNT_KEY parece não ser uma string base64 válida ou está corrompido.');
    }
    throw new Error('Erro desconhecido ao inicializar o Firebase Admin. Verifique a variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY.');
  }
}

// Create getters that initialize the app on first use
const getDb = () => initializeAdminApp().db;
const getAuth = () => initializeAdminApp().auth;

// Export getters instead of direct instances
export const db = getDb();
export const auth = getAuth();
