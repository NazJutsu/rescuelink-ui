import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ActiveJob, PastJob, User, Vehicle } from "../mock/types";
import { seedJobHistory, seedVehicles } from "../mock/customerSeed";

type AppContextValue = {
  user: User | null;
  vehicles: Vehicle[];
  jobs: PastJob[];
  activeJob: ActiveJob | null;
  login: (email: string, _password?: string) => void;
  register: (u: Omit<User, "id">) => void;
  logout: () => void;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  addJob: (job: PastJob) => void;
  completeActiveJob: (job: PastJob) => void;
  beginActiveJob: (job: ActiveJob) => void;
  clearActiveJob: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

let idCounter = 1;
const nextId = () => `u_${idCounter++}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>(seedVehicles);
  const [jobs, setJobs] = useState<PastJob[]>(seedJobHistory);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);

  const login = useCallback((email: string, _password?: string) => {
    setUser({
      id: "demo_customer",
      firstName: "Alex",
      lastName: "Rivera",
      email: email.trim() || "alex@example.com",
      phone: "+44 7700 900123",
      role: "customer",
    });
  }, []);

  const register = useCallback((u: Omit<User, "id">) => {
    setUser({
      id: nextId(),
      ...u,
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setActiveJob(null);
  }, []);

  const beginActiveJob = useCallback((job: ActiveJob) => {
    setActiveJob(job);
  }, []);

  const clearActiveJob = useCallback(() => {
    setActiveJob(null);
  }, []);

  const addJob = useCallback((job: PastJob) => {
    setJobs((prev) => [job, ...prev]);
  }, []);

  const completeActiveJob = useCallback((job: PastJob) => {
    setJobs((prev) => [job, ...prev]);
  }, []);

  const value = useMemo(
    () => ({
      user,
      vehicles,
      jobs,
      activeJob,
      login,
      register,
      logout,
      setVehicles,
      addJob,
      completeActiveJob,
      beginActiveJob,
      clearActiveJob,
    }),
    [
      user,
      vehicles,
      jobs,
      activeJob,
      login,
      register,
      logout,
      addJob,
      completeActiveJob,
      beginActiveJob,
      clearActiveJob,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/** Ephemeral active job for live tracking (mock). */
export function buildMockActiveJob(input: {
  jobId: string;
  quoteTotal: number;
  issueLabel: string;
  vehicleLabel: string;
}): ActiveJob {
  return {
    id: input.jobId,
    customerName: "You",
    operatorName: "James M.",
    operatorRating: 4.9,
    vehicleLabel: input.vehicleLabel,
    issueLabel: input.issueLabel,
    totalGbp: input.quoteTotal,
    etaMinutes: 6,
    status: "en_route",
    pickupLat: 51.5245,
    pickupLng: -0.0772,
    driverLat: 51.53,
    driverLng: -0.09,
  };
}
