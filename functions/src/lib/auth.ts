import { HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

export function assertAuthed(req: CallableRequest): string {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
  return req.auth.uid;
}
