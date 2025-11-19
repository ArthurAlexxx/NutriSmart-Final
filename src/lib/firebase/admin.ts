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
  // If services are already initialized, return them to avoid re-initializing.
  if (services) {
    return services;
  }
  
  // If the app is already initialized (e.g., by a previous serverless invocation), reuse it.
  if (admin.apps.length > 0 && admin.apps[0]) {
    const existingApp = admin.apps[0];
    const existingServices: FirebaseAdminServices = {
      app: existingApp,
      auth: admin.auth(existingApp),
      db: admin.firestore(existingApp),
    };
    // Cache the services
    services = existingServices;
    return existingServices;
  }
  
  // Vercel-recommended approach: Use a single service account key from env vars.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  try {
    // Parse the service account key from the environment variable.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    // Initialize the Firebase Admin SDK.
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    const newServices: FirebaseAdminServices = {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };
    
    // Cache the newly initialized services.
    services = newServices;
    return newServices;

  } catch (e: any) {
    console.error('Falha crítica ao inicializar o Firebase Admin com a chave de serviço. Verifique se o JSON é válido.', e.message);
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido ou está corrompida.');
  }
}

// Export getters that lazily initialize the app on first use.
export const db: Firestore = new Proxy({} as Firestore, {
  get: (target, prop) => Reflect.get(initializeAdminApp().db, prop),
});

export const auth: Auth = new Proxy({} as Auth, {
  get: (target, prop) => Reflect.get(initializeAdminApp().auth, prop),
});
