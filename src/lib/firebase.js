import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Usando a importação padrão para estabilidade
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// --- Singleton Pattern para evitar inicialização dupla ---
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// --- CORREÇÃO DE ESTABILIDADE ---
// Alterado de 'initializeFirestore' com cache persistente complexo para 'getFirestore' padrão.
// Isso resolve o erro "INTERNAL ASSERTION FAILED" limpando a dependência do IndexedDB corrompido.
const db = getFirestore(app);

const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions };
export default app;