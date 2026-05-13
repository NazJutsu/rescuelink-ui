import AsyncStorage from "@react-native-async-storage/async-storage";
import { createEmptyOperatorProfile } from "../mock/operatorProfile";
import type { OperatorProfile, User, Vehicle, PastJob } from "../mock/types";

export const PERSISTENCE_KEY = "rescuelink_app_state_v1";

export type PersistedAppSlice = {
  user: User | null;
  vehicles: Vehicle[];
  jobs: PastJob[];
  operatorProfile: OperatorProfile | null;
};

export function sanitizePersistedSlice(
  slice: PersistedAppSlice,
): PersistedAppSlice {
  if (slice.user == null) {
    return { user: null, vehicles: slice.vehicles, jobs: slice.jobs, operatorProfile: null };
  }
  if (slice.user.role === "customer") {
    return { ...slice, operatorProfile: null };
  }
  if (slice.operatorProfile == null) {
    return {
      ...slice,
      operatorProfile: createEmptyOperatorProfile(),
    };
  }
  return slice;
}

export async function loadPersistedSlice(): Promise<PersistedAppSlice | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSISTENCE_KEY);
    if (raw == null || raw.length === 0) return null;
    const parsed = JSON.parse(raw) as PersistedAppSlice;
    if (typeof parsed !== "object" || parsed == null) return null;
    return sanitizePersistedSlice(parsed);
  } catch {
    return null;
  }
}

export async function savePersistedSlice(slice: PersistedAppSlice): Promise<void> {
  try {
    await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(slice));
  } catch {
    /* ignore quota / RN bridge errors in MVP */
  }
}

export async function clearPersistedSlice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PERSISTENCE_KEY);
  } catch {
    /* noop */
  }
}
