import { appReducer, createInitialAppState } from "./reducer";

describe("appReducer", () => {
  it("routes operator registration into empty onboarding profile", () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, {
      type: "REGISTER",
      id: "u_test",
      user: {
        firstName: "A",
        lastName: "B",
        email: "x@y.com",
        phone: "+1",
        role: "operator",
      },
    });
    expect(s1.user?.role).toBe("operator");
    expect(s1.operatorProfile?.verificationStatus).toBe("incomplete_docs");
  });

  it("submits operator verification when profile valid", () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, {
      type: "REGISTER",
      id: "u_op",
      user: {
        firstName: "A",
        lastName: "B",
        email: "op@test.com",
        phone: "+44",
        role: "operator",
      },
    });
    const now = new Date().toISOString();
    const filled = {
      ...s1.operatorProfile!,
      legalFullName: "Full Legal Name Here",
      dateOfBirth: "1990-01-01",
      addressLine1: "1 Street",
      addressPostcode: "AB1 2CD",
      drivingLicenceNumber: "ABCDEFG",
      drivingCategories: "B, C",
      drivingLicenceExpiry: "2030-01-01",
      licenceFront: { fileName: "x.jpg", mime: "image/jpeg", uploadedAt: now },
      recoveryInsurer: "Ins",
      recoveryPolicyNumber: "P1",
      recoveryCoverLimitGbp: 50000,
      recoveryPolicyExpiry: "2030-02-02",
      recoveryCert: {
        fileName: "r.pdf",
        mime: "application/pdf",
        uploadedAt: now,
      },
      publicLiabilityInsurer: "PL",
      publicLiabilityExpiry: "2030-03-03",
      publicLiabilityCert: {
        fileName: "pl.pdf",
        mime: "application/pdf",
        uploadedAt: now,
      },
      recoveryVehicleReg: "AB12CDE",
      recoveryGvwBand: "7.5t",
      recoveryFlatbed: true,
      recoveryWinch: false,
      payoutAccountHolder: "Name",
      payoutSortMasked: "••-••-01",
      payoutAccountLast4: "1234",
      confirmAccuracy: true,
      towingExceeds3500kg: false,
    };
    const s2 = appReducer(s1, { type: "PATCH_OPERATOR_PROFILE", patch: filled });
    const s3 = appReducer(s2, { type: "SUBMIT_OPERATOR_VERIFICATION" });
    expect(s3.operatorProfile?.verificationStatus).toBe("pending_review");
  });

  it("dev rejection then resubmit clears status for onboarding", () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, {
      type: "REGISTER",
      id: "u_op",
      user: {
        firstName: "A",
        lastName: "B",
        email: "op@test.com",
        phone: "+44",
        role: "operator",
      },
    });
    const s2 = appReducer(s1, { type: "SUBMIT_OPERATOR_VERIFICATION" });
    const s3 = appReducer(s2, {
      type: "DEV_REJECT_OPERATOR",
      reason: "Licence unreadable.",
    });
    expect(s3.operatorProfile?.verificationStatus).toBe("rejected");
    expect(s3.operatorProfile?.rejectionReason).toBe("Licence unreadable.");
    const s4 = appReducer(s3, { type: "OPERATOR_RESET_AFTER_REJECTION" });
    expect(s4.operatorProfile?.verificationStatus).toBe("incomplete_docs");
    expect(s4.operatorProfile?.rejectionReason).toBeUndefined();
    expect(s4.operatorProfile?.submittedAt).toBeUndefined();
    expect(s4.operatorProfile?.onboardingStepIndex).toBe(0);
  });

  it("submit after rejection clears leftover rejectionReason", () => {
    const s0 = createInitialAppState();
    const s1 = appReducer(s0, {
      type: "REGISTER",
      id: "x",
      user: {
        firstName: "a",
        lastName: "b",
        email: "z@z.com",
        phone: "+1",
        role: "operator",
      },
    });
    const sRejected = appReducer(
      appReducer(s1, { type: "SUBMIT_OPERATOR_VERIFICATION" }),
      { type: "DEV_REJECT_OPERATOR", reason: "X" },
    );
    expect(sRejected.operatorProfile?.rejectionReason).toBe("X");
    const sResubmit = appReducer(sRejected, { type: "OPERATOR_RESET_AFTER_REJECTION" });
    const pendingAgain = appReducer(sResubmit, {
      type: "SUBMIT_OPERATOR_VERIFICATION",
    });
    expect(pendingAgain.operatorProfile?.verificationStatus).toBe("pending_review");
    expect(pendingAgain.operatorProfile?.rejectionReason).toBeUndefined();
  });
});
