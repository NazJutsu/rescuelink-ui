import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ActiveJob, OperatorProfile, PastJob, User, Vehicle } from "../types";
import { isOperatorProfileSubmittable } from "../data/operatorProfile";
import {
  appReducer,
  createInitialAppState,
  type AppState,
} from "./reducer";
import {
  clearPersistedSlice,
  loadPersistedSlice,
  savePersistedSlice,
} from "./storage";
import { colors } from "../theme/tokens";
import { StyleSheet, View } from "react-native";
import { isFirebaseConfigured } from "../firebase/config";
import {
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignOut,
  subscribeAuthState,
} from "../firebase/authService";
import {
  createUserDoc,
  getUserDoc,
  createOperatorDoc,
  getOperatorDoc,
  saveOperatorDoc,
} from "../firebase/userService";

type AppContextValue = {
  user: User | null;
  vehicles: Vehicle[];
  jobs: PastJob[];
  activeJob: ActiveJob | null;
  operatorProfile: OperatorProfile | null;
  /** Signs in with email + password. Throws on failure (catch for error message). */
  login: (email: string, password: string) => Promise<void>;
  /** Creates a new account. Throws on failure (catch for error message). */
  register: (u: Omit<User, "id">, password: string) => Promise<void>;
  logout: () => void;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  addJob: (job: PastJob) => void;
  completeActiveJob: (job: PastJob) => void;
  beginActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
  patchOperatorProfile: (patch: Partial<OperatorProfile>) => void;
  setOperatorStep: (step: number) => void;
  submitOperatorVerification: () => { ok: boolean; reason?: string };
  devApproveOperator: () => void;
  devRejectOperator: (reason?: string) => void;
  beginOperatorResubmit: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function toPersistedSlice(s: AppState) {
  return {
    user: s.user,
    vehicles: s.vehicles,
    jobs: s.jobs,
    operatorProfile: s.operatorProfile,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialAppState);
  const [hydrated, setHydrated] = useState(false);
  // authReady becomes true once the first onAuthStateChanged fires (or immediately when
  // Firebase is not configured, so the blank-screen gate doesn't block the mock flow).
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured());
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncProfileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate from AsyncStorage ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const slice = await loadPersistedSlice();
      if (cancelled) return;
      if (slice) {
        dispatch({ type: "HYDRATE", payload: slice });
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Persist state to AsyncStorage (debounced) ────────────────────────────
  const persistSlice = useMemo(() => toPersistedSlice(state), [state]);

  useEffect(() => {
    if (!hydrated) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      if (persistSlice.user == null) {
        void clearPersistedSlice();
      } else {
        void savePersistedSlice(persistSlice);
      }
    }, 400);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [hydrated, persistSlice]);

  // ── Firebase auth state listener ─────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubscribe = subscribeAuthState(async (fbUser) => {
      if (fbUser == null) {
        dispatch({ type: "LOGOUT" });
        setAuthReady(true);
        return;
      }

      try {
        const user = await getUserDoc(fbUser.uid);
        if (!user) {
          // Auth record exists but Firestore doc is missing — sign out cleanly
          await firebaseSignOut();
          dispatch({ type: "LOGOUT" });
          setAuthReady(true);
          return;
        }

        let operatorProfile: OperatorProfile | null = null;
        if (user.role === "operator") {
          operatorProfile =
            (await getOperatorDoc(fbUser.uid)) ??
            (await createOperatorDoc(fbUser.uid));
        }

        dispatch({ type: "AUTH_SET_USER", user, operatorProfile });
      } catch {
        dispatch({ type: "LOGOUT" });
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  // ── Sync operator profile to Firestore (debounced, Firebase path only) ───
  useEffect(() => {
    if (!isFirebaseConfigured() || !hydrated || !authReady) return;
    if (!state.user || state.user.role !== "operator" || !state.operatorProfile) return;

    const uid = state.user.id;
    const profile = state.operatorProfile;

    if (syncProfileTimer.current) clearTimeout(syncProfileTimer.current);
    syncProfileTimer.current = setTimeout(() => {
      void saveOperatorDoc(uid, profile);
    }, 800);

    return () => {
      if (syncProfileTimer.current) clearTimeout(syncProfileTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.operatorProfile]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    if (isFirebaseConfigured()) {
      await firebaseSignIn(email, password);
      // onAuthStateChanged handles state update
    } else {
      const e = email.trim().toLowerCase();
      if (e.includes("operator")) {
        dispatch({ type: "LOGIN_OPERATOR_APPROVED", email });
      } else {
        dispatch({ type: "LOGIN_CUSTOMER", email });
      }
    }
  }, []);

  const register = useCallback(
    async (u: Omit<User, "id">, password: string): Promise<void> => {
      if (isFirebaseConfigured()) {
        const fbUser = await firebaseSignUp(u.email, password);
        await createUserDoc(fbUser.uid, u);
        if (u.role === "operator") {
          await createOperatorDoc(fbUser.uid);
        }
        // onAuthStateChanged handles state update
      } else {
        const id = `u_${Date.now()}`;
        dispatch({ type: "REGISTER", user: u, id });
      }
    },
    [],
  );

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    void clearPersistedSlice();
    if (isFirebaseConfigured()) {
      void firebaseSignOut();
    }
  }, []);

  // ── Other actions (unchanged) ─────────────────────────────────────────────
  const setVehicles = useCallback(
    (action: React.SetStateAction<Vehicle[]>) => {
      dispatch({
        type: "SET_VEHICLES",
        vehicles:
          typeof action === "function" ? action(state.vehicles) : action,
      });
    },
    [state.vehicles],
  );

  const addJob = useCallback((job: PastJob) => {
    dispatch({ type: "ADD_JOB", job });
  }, []);

  const completeActiveJob = useCallback((job: PastJob) => {
    dispatch({ type: "COMPLETE_ACTIVE_JOB", job });
  }, []);

  const beginActiveJob = useCallback((job: ActiveJob) => {
    dispatch({ type: "BEGIN_ACTIVE_JOB", job });
  }, []);

  const clearActiveJob = useCallback(() => {
    dispatch({ type: "CLEAR_ACTIVE_JOB" });
  }, []);

  const patchOperatorProfile = useCallback((patch: Partial<OperatorProfile>) => {
    dispatch({ type: "PATCH_OPERATOR_PROFILE", patch });
  }, []);

  const setOperatorStep = useCallback((step: number) => {
    dispatch({ type: "OPERATOR_SET_STEP", step });
  }, []);

  const submitOperatorVerification = useCallback(() => {
    if (state.operatorProfile == null) {
      return { ok: false as const, reason: "No operator profile" };
    }
    if (!isOperatorProfileSubmittable(state.operatorProfile)) {
      return {
        ok: false as const,
        reason: "Complete all required fields and simulated uploads first.",
      };
    }
    dispatch({ type: "SUBMIT_OPERATOR_VERIFICATION" });
    return { ok: true as const };
  }, [state.operatorProfile]);

  const devApproveOperator = useCallback(() => {
    dispatch({ type: "DEV_APPROVE_OPERATOR" });
  }, []);

  const devRejectOperator = useCallback((reason?: string) => {
    dispatch({ type: "DEV_REJECT_OPERATOR", reason });
  }, []);

  const beginOperatorResubmit = useCallback(() => {
    dispatch({ type: "OPERATOR_RESET_AFTER_REJECTION" });
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      vehicles: state.vehicles,
      jobs: state.jobs,
      activeJob: state.activeJob,
      operatorProfile: state.operatorProfile,
      login,
      register,
      logout,
      setVehicles,
      addJob,
      completeActiveJob,
      beginActiveJob,
      clearActiveJob,
      patchOperatorProfile,
      setOperatorStep,
      submitOperatorVerification,
      devApproveOperator,
      devRejectOperator,
      beginOperatorResubmit,
    }),
    [
      state.user,
      state.vehicles,
      state.jobs,
      state.activeJob,
      state.operatorProfile,
      login,
      register,
      logout,
      setVehicles,
      addJob,
      completeActiveJob,
      beginActiveJob,
      clearActiveJob,
      patchOperatorProfile,
      setOperatorStep,
      submitOperatorVerification,
      devApproveOperator,
      devRejectOperator,
      beginOperatorResubmit,
    ],
  );

  if (!hydrated || !authReady) {
    return <View style={styles.hydrate} />;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

const styles = StyleSheet.create({
  hydrate: { flex: 1, backgroundColor: colors.bg },
});

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
