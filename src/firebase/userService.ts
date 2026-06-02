import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./config";
import { createEmptyOperatorProfile } from "../data/operatorProfile";
import type { OperatorProfile, User } from "../types";

type UserDoc = Omit<User, "id"> & { uid: string; createdAt: string };

export async function createUserDoc(
  uid: string,
  data: Omit<User, "id">,
): Promise<void> {
  const payload: UserDoc = {
    uid,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    role: data.role,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(getFirebaseDb(), "users", uid), payload);
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data() as UserDoc;
  return {
    id: uid,
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone,
    role: d.role,
  };
}

export async function createOperatorDoc(uid: string): Promise<OperatorProfile> {
  const profile = createEmptyOperatorProfile();
  await setDoc(doc(getFirebaseDb(), "operators", uid), profile);
  return profile;
}

export async function getOperatorDoc(uid: string): Promise<OperatorProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), "operators", uid));
  if (!snap.exists()) return null;
  return snap.data() as OperatorProfile;
}

/** Merges profile fields into operators/{uid} — used to persist onboarding progress. */
export async function saveOperatorDoc(
  uid: string,
  profile: OperatorProfile,
): Promise<void> {
  await setDoc(doc(getFirebaseDb(), "operators", uid), profile, { merge: true });
}
