import {
  approvedOperatorSampleProfile,
  createEmptyOperatorProfile,
} from "../data/operatorProfile";
import { seedJobHistory, seedVehicles } from "../data/customerSeed";
import type { ActiveJob, OperatorProfile, PastJob, User, Vehicle } from "../types";

export type AppState = {
  user: User | null;
  vehicles: Vehicle[];
  jobs: PastJob[];
  activeJob: ActiveJob | null;
  operatorProfile: OperatorProfile | null;
};

export type AppAction =
  | {
      type: "HYDRATE";
      payload: Partial<Pick<AppState, "user" | "vehicles" | "jobs" | "operatorProfile">>;
    }
  | { type: "AUTH_SET_USER"; user: User; operatorProfile: OperatorProfile | null }
  | { type: "LOGIN_CUSTOMER"; email: string }
  | { type: "LOGIN_OPERATOR_APPROVED"; email: string }
  | { type: "REGISTER"; user: Omit<User, "id">; id: string }
  | { type: "LOGOUT" }
  | { type: "SET_VEHICLES"; vehicles: Vehicle[] }
  | { type: "ADD_JOB"; job: PastJob }
  | { type: "COMPLETE_ACTIVE_JOB"; job: PastJob }
  | { type: "BEGIN_ACTIVE_JOB"; job: ActiveJob }
  | { type: "CLEAR_ACTIVE_JOB" }
  | { type: "PATCH_OPERATOR_PROFILE"; patch: Partial<OperatorProfile> }
  | { type: "OPERATOR_SET_STEP"; step: number }
  | { type: "SUBMIT_OPERATOR_VERIFICATION" }
  | { type: "DEV_APPROVE_OPERATOR" }
  | { type: "DEV_REJECT_OPERATOR"; reason?: string }
  | { type: "OPERATOR_RESET_AFTER_REJECTION" };

export function createInitialAppState(): AppState {
  return {
    user: null,
    vehicles: seedVehicles,
    jobs: seedJobHistory,
    activeJob: null,
    operatorProfile: null,
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        ...action.payload,
        activeJob: null,
      };
    case "AUTH_SET_USER":
      return {
        ...state,
        user: action.user,
        operatorProfile: action.operatorProfile,
        activeJob: null,
      };
    case "LOGIN_CUSTOMER":
      return {
        ...state,
        user: {
          id: "demo_customer",
          firstName: "Alex",
          lastName: "Rivera",
          email: action.email.trim() || "alex@example.com",
          phone: "+44 7700 900123",
          role: "customer",
        },
        operatorProfile: null,
        activeJob: null,
      };
    case "LOGIN_OPERATOR_APPROVED":
      return {
        ...state,
        user: {
          id: "demo_operator",
          firstName: "Jamie",
          lastName: "Operatorson",
          email: action.email.trim() || "jamie@operators.test",
          phone: "+44 7700 900999",
          role: "operator",
        },
        operatorProfile: approvedOperatorSampleProfile(),
        activeJob: null,
      };
    case "REGISTER":
      return {
        ...state,
        user: {
          id: action.id,
          firstName: action.user.firstName,
          lastName: action.user.lastName,
          email: action.user.email,
          phone: action.user.phone,
          role: action.user.role,
        },
        operatorProfile:
          action.user.role === "operator"
            ? createEmptyOperatorProfile()
            : null,
        activeJob: null,
      };
    case "LOGOUT":
      return createInitialAppState();
    case "SET_VEHICLES":
      return { ...state, vehicles: action.vehicles };
    case "ADD_JOB":
      return { ...state, jobs: [action.job, ...state.jobs] };
    case "COMPLETE_ACTIVE_JOB":
      return {
        ...state,
        jobs: [action.job, ...state.jobs],
        activeJob: null,
      };
    case "BEGIN_ACTIVE_JOB":
      return { ...state, activeJob: action.job };
    case "CLEAR_ACTIVE_JOB":
      return { ...state, activeJob: null };
    case "PATCH_OPERATOR_PROFILE": {
      if (state.operatorProfile == null || state.user?.role !== "operator") {
        return state;
      }
      return {
        ...state,
        operatorProfile: { ...state.operatorProfile, ...action.patch },
      };
    }
    case "OPERATOR_SET_STEP": {
      if (state.operatorProfile == null) return state;
      return {
        ...state,
        operatorProfile: {
          ...state.operatorProfile,
          onboardingStepIndex: Math.min(Math.max(0, action.step), 5),
        },
      };
    }
    case "SUBMIT_OPERATOR_VERIFICATION": {
      if (state.operatorProfile == null) return state;
      return {
        ...state,
        operatorProfile: {
          ...state.operatorProfile,
          verificationStatus: "pending_review",
          submittedAt: new Date().toISOString(),
          rejectionReason: undefined,
        },
      };
    }
    case "DEV_APPROVE_OPERATOR": {
      if (state.operatorProfile == null) return state;
      return {
        ...state,
        operatorProfile: {
          ...state.operatorProfile,
          verificationStatus: "approved",
          rejectionReason: undefined,
        },
      };
    }
    case "DEV_REJECT_OPERATOR": {
      if (state.operatorProfile == null) return state;
      return {
        ...state,
        operatorProfile: {
          ...state.operatorProfile,
          verificationStatus: "rejected",
          rejectionReason:
            action.reason?.trim() ||
            "Mock rejection: insurer certificate date could not be matched to policy wording.",
          submittedAt: state.operatorProfile.submittedAt,
        },
      };
    }
    case "OPERATOR_RESET_AFTER_REJECTION": {
      if (state.operatorProfile == null) return state;
      return {
        ...state,
        operatorProfile: {
          ...state.operatorProfile,
          verificationStatus: "incomplete_docs",
          submittedAt: undefined,
          rejectionReason: undefined,
          onboardingStepIndex: 0,
        },
      };
    }
    default:
      return state;
  }
}
