export type UserRole = "customer" | "operator";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
};

export type Vehicle = {
  id: string;
  make: string;
  model: string;
  registration: string;
  year: number;
  isEv: boolean;
  isDefault: boolean;
};

export type OperatorPin = {
  id: string;
  name: string;
  rating: number;
  etaMinutes: number;
  avatarInitials: string;
  latitude: number;
  longitude: number;
  flatbed: boolean;
  winch: boolean;
};

export type JobStatus =
  | "requested"
  | "matching"
  | "en_route"
  | "arrived"
  | "completed"
  | "cancelled";

export type PastJob = {
  id: string;
  createdAt: string;
  status: JobStatus;
  operatorName: string;
  amountGbp: number;
  pickupLabel: string;
  vehicleReg: string;
};

export type QuoteBreakdown = {
  baseGbp: number;
  distanceGbp: number;
  motorwaySurchargeGbp: number;
  subtotalGbp: number;
  vatGbp: number;
  totalGbp: number;
};

export type ActiveJob = {
  id: string;
  customerName: string;
  operatorName: string;
  operatorRating: number;
  vehicleLabel: string;
  issueLabel: string;
  totalGbp: number;
  etaMinutes: number;
  status: JobStatus;
  pickupLat: number;
  pickupLng: number;
  driverLat: number;
  driverLng: number;
};
