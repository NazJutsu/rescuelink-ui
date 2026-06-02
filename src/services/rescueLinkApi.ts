import type { Dispatch, SetStateAction } from "react";
import type { ActiveJob, OperatorProfile, PastJob, User, Vehicle } from "../types";

export type RegisterInput = Omit<User, "id">;

export interface RescueLinkApi {
  login: (email: string, password?: string) => void;
  register: (u: RegisterInput) => void;
  logout: () => void;
  setVehicles: Dispatch<SetStateAction<Vehicle[]>>;
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
}
