import * as admin from "firebase-admin";

// Initialise once — Firebase Functions runtime calls this once per cold start.
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };
