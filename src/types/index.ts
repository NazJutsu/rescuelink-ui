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
  | "inspection_pending"
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

/** Marketplace verification — mock; backend issues real transitions via webhooks. */
export type VerificationStatus =
  | "incomplete_docs"
  | "pending_review"
  | "approved"
  | "rejected";

/** Placeholder upload metadata — Phase 2: blob storage + scan. */
export type MockUploadedFile = {
  fileName: string;
  mime: string;
  uploadedAt: string;
};

export type BusinessType = "sole_trader" | "limited_company";

/**
 * Tow/recovery operator compliance draft (UK-oriented field labels).
 * Payout identifiers stay masked on-device for MVP demos.
 */
export type OperatorProfile = {
  verificationStatus: VerificationStatus;
  /** When status is rejected — mock now; webhook payload later */
  rejectionReason?: string;
  onboardingStepIndex: number;
  legalFullName: string;
  dateOfBirth: string;
  addressLine1: string;
  addressPostcode: string;
  drivingLicenceNumber: string;
  drivingCategories: string;
  drivingLicenceExpiry: string;
  licenceFront?: MockUploadedFile;
  businessType: BusinessType;
  companyNumber: string;
  utr: string;
  recoveryInsurer: string;
  recoveryPolicyNumber: string;
  recoveryCoverLimitGbp: number;
  recoveryPolicyExpiry: string;
  recoveryCert?: MockUploadedFile;
  publicLiabilityInsurer: string;
  publicLiabilityExpiry: string;
  publicLiabilityCert?: MockUploadedFile;
  employsStaff: boolean;
  employerLiabilityCert?: MockUploadedFile;
  /** null until answered — gates O-licence section */
  towingExceeds3500kg: boolean | null;
  oLicenceNumber: string;
  oLicenceTrafficArea: string;
  oLicenceExpiry: string;
  oLicenceScan?: MockUploadedFile;
  recoveryVehicleReg: string;
  recoveryGvwBand: string;
  recoveryFlatbed: boolean;
  recoveryWinch: boolean;
  payoutAccountHolder: string;
  payoutSortMasked: string;
  payoutAccountLast4: string;
  yearsExperience: string;
  confirmAccuracy: boolean;
  submittedAt?: string;
};
