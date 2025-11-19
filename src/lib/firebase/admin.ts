
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
  if (services) {
    return services;
  }
  
  // If the admin app is already initialized (e.g., by another part of the system or a previous request),
  // use it to create our services object.
  if (admin.apps.length > 0) {
    const app = admin.apps[0] as App;
    services = {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };
    return services;
  }

  // Vercel environment variables for Firebase Admin
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace escaped newlines from the environment variable
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('As variáveis de ambiente do Firebase Admin (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY) não estão definidas corretamente.');
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    services = {
      app,
      auth: admin.auth(app),
      db: admin.firestore(app),
    };
    return services;

  } catch (error: any) {
    console.error("Falha crítica ao inicializar o Firebase Admin SDK:", error.message);
    throw new Error('Erro desconhecido ao inicializar o Firebase Admin. Verifique as variáveis de ambiente.');
  }
}

// Create getters that initialize the app on first use.
// This lazy initialization prevents the code from running during the build process.
const db = new Proxy({} as Firestore, {
  get: (target, prop) => {
    return Reflect.get(initializeAdminApp().db, prop);
  },
});

const auth = new Proxy({} as Auth, {
  get: (target, prop) => {
    return Reflect.get(initializeAdminApp().auth, prop);
  },
});


// Export the proxied instances.
export { db, auth };
