// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

// This interface defines the structure of our admin services singleton.
interface FirebaseAdminServices {
  app: App;
  auth: Auth;
  db: Firestore;
}

// A global variable to hold the initialized services, ensuring it's a singleton.
let adminServices: FirebaseAdminServices | null = null;

/**
 * Initializes the Firebase Admin SDK using a service account key from environment variables.
 * This function follows a robust singleton pattern suitable for serverless environments like Vercel.
 * It prioritizes the all-in-one FIREBASE_SERVICE_ACCOUNT_KEY for reliability.
 *
 * @returns {FirebaseAdminServices} The initialized Firebase Admin services.
 */
function initializeAdmin(): FirebaseAdminServices {
  // If the services are already initialized, return the existing instance.
  // This prevents re-initialization on subsequent function invocations.
  if (adminServices) {
    return adminServices;
  }

  // Vercel's recommended approach: use a single environment variable
  // containing the JSON of the service account key.
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error(
      'A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida. Este é o JSON completo da chave de serviço do Firebase.'
    );
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);

    // If there are no initialized apps, create a new one.
    if (!admin.apps.length) {
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      // Store the initialized services in the global singleton variable.
      adminServices = {
        app,
        auth: admin.auth(app),
        db: admin.firestore(app),
      };
    } else {
      // If an app is already initialized (can happen in serverless environments),
      // get the default app and its associated services.
      const app = admin.app();
      adminServices = {
        app,
        auth: admin.auth(app),
        db: admin.firestore(app),
      };
    }
    
    return adminServices;

  } catch (e: any) {
    console.error('Falha crítica ao inicializar o Firebase Admin. Verifique o JSON em FIREBASE_SERVICE_ACCOUNT_KEY.', e.message);
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido ou está corrompida.');
  }
}

// These are proxies that ensure initializeAdmin() is called only when 'db' or 'auth' is accessed for the first time.
// This lazy initialization is efficient and safe for serverless environments.
export const db: Firestore = new Proxy({} as Firestore, {
  get: (target, prop) => {
    return Reflect.get(initializeAdmin().db, prop);
  },
});

export const auth: Auth = new Proxy({} as Auth, {
  get: (target, prop) => {
    return Reflect.get(initializeAdmin().auth, prop);
  },
});
