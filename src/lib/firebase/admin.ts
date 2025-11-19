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

/**
 * Initializes the Firebase Admin SDK using a service account key from environment variables.
 * This function follows a robust singleton pattern suitable for serverless environments like Vercel.
 * @returns {FirebaseAdminServices} The initialized Firebase Admin services.
 */
function initializeAdminApp(): FirebaseAdminServices {
  // If services are already initialized, return them to avoid re-initializing.
  if (services) {
    return services;
  }
  
  // If the default app is already initialized, reuse it.
  // This can happen if multiple serverless function invocations occur in close succession.
  if (admin.apps.length > 0 && admin.apps[0]) {
    const existingApp = admin.apps[0];
    services = {
      app: existingApp,
      auth: admin.auth(existingApp),
      db: admin.firestore(existingApp),
    };
    return services;
  }
  
  // The recommended approach for Vercel: use a single service account key from env vars.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida. Este é um JSON completo da chave de serviço do Firebase.');
  }

  try {
    // Parse the service account key from the environment variable.
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    // Initialize the Firebase Admin SDK with the parsed credentials.
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
    console.error('Falha crítica ao inicializar o Firebase Admin. Verifique o JSON em FIREBASE_SERVICE_ACCOUNT_KEY.', e.message);
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido ou está corrompida.');
  }
}

// Export getters that lazily initialize the app on first use.
// This proxy ensures initializeAdminApp() is only called when 'db' or 'auth' is accessed.
export const db: Firestore = new Proxy({} as Firestore, {
  get: (target, prop) => Reflect.get(initializeAdminApp().db, prop),
});

export const auth: Auth = new Proxy({} as Auth, {
  get: (target, prop) => Reflect.get(initializeAdminApp().auth, prop),
});
