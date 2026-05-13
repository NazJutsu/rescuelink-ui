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
import type { ActiveJob, OperatorProfile, PastJob, User, Vehicle } from "../mock/types";
import { isOperatorProfileSubmittable } from "../mock/operatorProfile";
import {
  appReducer,
  createInitialAppState,
  type AppState,
} from "../appState/reducer";
import {
  clearPersistedSlice,
  loadPersistedSlice,
  savePersistedSlice,
} from "../persistence/appStateStorage";
import { colors } from "../theme/tokens";
import { StyleSheet, View } from "react-native";

type AppContextValue = {
  user: User | null;
  vehicles: Vehicle[];
  jobs: PastJob[];
  activeJob: ActiveJob | null;
  operatorProfile: OperatorProfile | null;
  login: (email: string, _password?: string) => void;
  register: (u: Omit<User, "id">) => void;
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
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const login = useCallback((email: string) => {
    const e = email.trim().toLowerCase();
    if (e.includes("operator")) {
      dispatch({ type: "LOGIN_OPERATOR_APPROVED", email });
    } else {
      dispatch({ type: "LOGIN_CUSTOMER", email });
    }
  }, []);

  const register = useCallback((u: Omit<User, "id">) => {
    const id = `u_${Date.now()}`;
    dispatch({ type: "REGISTER", user: u, id });
  }, []);

  const logout = useCallback(() => {
    void clearPersistedSlice();
    dispatch({ type: "LOGOUT" });
  }, []);

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

  if (!hydrated) {
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
