import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Returns true only when all required env vars are present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
}

function ensureApp() {
  return getApps().length ? getApp() : initializeApp(cfg);
}

/**
 * Returns the Firebase Auth instance.
 * Uses inMemoryPersistence (Firebase JS SDK 12 removed getReactNativePersistence).
 * Sessions last for the lifetime of the app process; users must sign in after a restart.
 */
export function getFirebaseAuth() {
  const app = ensureApp();
  try {
    return initializeAuth(app, { persistence: inMemoryPersistence });
  } catch {
    // initializeAuth throws on subsequent calls — fall back to getAuth
    return getAuth(app);
  }
}

/** Returns the Firebase App instance, initialising it on first call. */
export function getFirebaseApp() {
  return ensureApp();
}

export function getFirebaseDb() {
  return getFirestore(ensureApp());
}
