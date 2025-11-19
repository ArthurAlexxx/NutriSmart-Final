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

  // --- NEW LOGIC: Prefer a single service account key from env ---
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
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
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
      throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido.');
    }
  }

  // --- FALLBACK LOGIC: Use separate environment variables ---
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace escaped newlines from the environment variable
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('As variáveis de ambiente do Firebase Admin (FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) não estão definidas corretamente.');
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    return {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };

  } catch (error: any) {
    console.error("Falha crítica ao inicializar o Firebase Admin SDK:", error.message);
    throw new Error('Erro desconhecido ao inicializar o Firebase Admin. Verifique as variáveis de ambiente.');
  }
}

function getFirebaseAdmin(): FirebaseAdminServices {
    if (!services) {
        services = initializeAdminApp();
    }
    return services;
}

// Export getters that lazily initialize the app on first use.
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
