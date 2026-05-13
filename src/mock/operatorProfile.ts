import type { OperatorProfile } from "./types";

export function createEmptyOperatorProfile(): OperatorProfile {
  return {
    verificationStatus: "incomplete_docs",
    onboardingStepIndex: 0,
    legalFullName: "",
    dateOfBirth: "",
    addressLine1: "",
    addressPostcode: "",
    drivingLicenceNumber: "",
    drivingCategories: "",
    drivingLicenceExpiry: "",
    businessType: "sole_trader",
    companyNumber: "",
    utr: "",
    recoveryInsurer: "",
    recoveryPolicyNumber: "",
    recoveryCoverLimitGbp: 0,
    recoveryPolicyExpiry: "",
    publicLiabilityInsurer: "",
    publicLiabilityExpiry: "",
    employsStaff: false,
    towingExceeds3500kg: null,
    oLicenceNumber: "",
    oLicenceTrafficArea: "",
    oLicenceExpiry: "",
    recoveryVehicleReg: "",
    recoveryGvwBand: "",
    recoveryFlatbed: false,
    recoveryWinch: false,
    payoutAccountHolder: "",
    payoutSortMasked: "",
    payoutAccountLast4: "",
    yearsExperience: "",
    confirmAccuracy: false,
  };
}

export function isOperatorProfileSubmittable(p: OperatorProfile): boolean {
  const base =
    p.legalFullName.trim().length > 3 &&
    p.dateOfBirth.trim().length > 3 &&
    p.addressLine1.trim().length > 3 &&
    p.addressPostcode.trim().length > 3 &&
    p.drivingLicenceNumber.trim().length > 3 &&
    p.drivingCategories.trim().length > 0 &&
    p.drivingLicenceExpiry.trim().length > 3 &&
    p.recoveryInsurer.trim().length > 1 &&
    p.recoveryPolicyNumber.trim().length > 2 &&
    p.recoveryPolicyExpiry.trim().length > 3 &&
    p.publicLiabilityInsurer.trim().length > 1 &&
    p.publicLiabilityExpiry.trim().length > 3 &&
    p.recoveryVehicleReg.trim().length > 1 &&
    p.recoveryGvwBand.trim().length > 0 &&
    (p.recoveryFlatbed || p.recoveryWinch) &&
    p.payoutAccountHolder.trim().length > 1 &&
    p.payoutSortMasked.trim().length > 3 &&
    p.payoutAccountLast4.length >= 4 &&
    p.confirmAccuracy &&
    p.licenceFront != null &&
    p.recoveryCert != null &&
    p.publicLiabilityCert != null;

  if (!base) return false;
  if (
    p.businessType === "limited_company" &&
    p.companyNumber.trim().length < 2
  ) {
    return false;
  }
  if (p.employsStaff && !p.employerLiabilityCert) return false;
  if (p.towingExceeds3500kg !== true && p.towingExceeds3500kg !== false) {
    return false;
  }
  if (
    p.towingExceeds3500kg === true &&
    (p.oLicenceNumber.trim().length < 2 ||
      p.oLicenceExpiry.trim().length < 3 ||
      !p.oLicenceScan)
  ) {
    return false;
  }
  return true;
}

export function approvedOperatorSampleProfile(): OperatorProfile {
  const p = createEmptyOperatorProfile();
  const now = new Date().toISOString();
  return {
    ...p,
    verificationStatus: "approved",
    legalFullName: "Jamie Operatorson",
    dateOfBirth: "1988-06-02",
    addressLine1: "1 Wharf Rd",
    addressPostcode: "E16 4SA",
    drivingLicenceNumber: "XXXXXXXX",
    drivingCategories: "B, C, C+E",
    drivingLicenceExpiry: "2030-12-31",
    businessType: "sole_trader",
    recoveryInsurer: "TowerSure",
    recoveryPolicyNumber: "RS-POLICY-991",
    recoveryCoverLimitGbp: 250_000,
    recoveryPolicyExpiry: "2030-01-15",
    publicLiabilityInsurer: "TownCover",
    publicLiabilityExpiry: "2030-02-02",
    towingExceeds3500kg: true,
    oLicenceNumber: "OL1234567",
    oLicenceTrafficArea: "North West",
    oLicenceExpiry: "2030-08-08",
    recoveryVehicleReg: "RL99 TOW",
    recoveryGvwBand: "7500 kg",
    recoveryFlatbed: true,
    recoveryWinch: true,
    payoutAccountHolder: "Jamie Operatorson",
    payoutSortMasked: "••-••-01",
    payoutAccountLast4: "9012",
    yearsExperience: "8",
    confirmAccuracy: true,
    onboardingStepIndex: 8,
    submittedAt: now,
    licenceFront: {
      fileName: "demo-licence-front.jpg",
      mime: "image/jpeg",
      uploadedAt: now,
    },
    recoveryCert: {
      fileName: "demo-recovery-cert.pdf",
      mime: "application/pdf",
      uploadedAt: now,
    },
    publicLiabilityCert: {
      fileName: "demo-pl-cert.pdf",
      mime: "application/pdf",
      uploadedAt: now,
    },
    oLicenceScan: {
      fileName: "demo-o-licence.pdf",
      mime: "application/pdf",
      uploadedAt: now,
    },
  };
}
