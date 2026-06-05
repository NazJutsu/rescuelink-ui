import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const cred = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
  return cred.user;
}

export async function firebaseSignUp(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  const cred = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim().toLowerCase(),
    password,
  );
  return cred.user;
}

export async function firebaseSignOut(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export async function firebaseResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
}

/** Subscribes to Firebase auth state changes. Returns the unsubscribe function. */
export function subscribeAuthState(
  callback: (user: FirebaseUser | null) => void,
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
