import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validar que todas las propiedades requeridas estén definidas
for (const [key, value] of Object.entries(firebaseConfig)) {
  if (!value) {
    const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
    throw new Error(`Falta variable de entorno: ${envVarName}`);
  }
}

// Para evitar problemas en HMR de Next.js (Hot Module Replacement)
const isAlreadyInitialized = getApps().length > 0;
const app = !isAlreadyInitialized ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Inicializar Firestore de forma moderna para evitar la advertencia de depreciación
let firestoreDb;
if (!isAlreadyInitialized) {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} else {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
