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
  // If services are already initialized, return them.
  if (admin.apps.length > 0 && admin.apps[0]) {
    const existingApp = admin.apps[0];
    return {
      app: existingApp,
      auth: admin.auth(existingApp),
      db: admin.firestore(existingApp),
    };
  }
  
  // Vercel-recommended approach: Use a single service account key from env vars.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    return {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };
  } catch (e: any) {
    console.error('Falha crítica ao inicializar o Firebase Admin com a chave de serviço. Verifique se o JSON é válido.', e.message);
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido ou está corrompida.');
  }
}

function getFirebaseAdmin(): FirebaseAdminServices {
    if (!services) {
        services = initializeAdminApp();
    }
    return services;
}

// Export getters that lazily initialize the app on first use.
// This is robust for serverless environments.
export const db: Firestore = new Proxy({} as Firestore, {
  get: (target, prop) => {
    return Reflect.get(getFirebaseAdmin().db, prop);
  },
});

export const auth: Auth = new Proxy({} as Auth, {
  get: (target, prop) => {
    return Reflect.get(getFirebaseAdmin().auth, prop);
  },
});
