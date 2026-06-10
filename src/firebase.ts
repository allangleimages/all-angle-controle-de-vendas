import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Reads from Vercel config-override environment variables, and defaults to standard project credentials
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyCj0l_-6uaPWvY5YWwjvlPNf2u0TjUlvyo",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0024621320.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0024621320",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0024621320.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "37949699282",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:37949699282:web:ce0c14e57b661b8f3aa90b",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Support custom database IDs from config if any
const firestoreDatabaseId = metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-154be24f-4843-4080-8438-f0b525634fe2";
export const db = getFirestore(app, firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
