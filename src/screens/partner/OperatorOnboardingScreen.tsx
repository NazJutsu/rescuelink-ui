import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { DevPageBadge } from "../../dev/DevPageBadge";
import { RLButton, RLField, RLSectionLabel } from "../../components/ui";
import { FieldGroup } from "../../components/FieldGroup";
import { DEV_PAGES } from "../../dev/pageNumbers";
import { useApp } from "../../state/AppContext";
import type { MockUploadedFile, OperatorProfile } from "../../types";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";
import { isOperatorProfileSubmittable } from "../../data/operatorProfile";
import { isFirebaseConfigured } from "../../firebase/config";
import { pickDocument, uploadOperatorDoc } from "../../firebase/storageService";

const TOTAL_STEPS = 6;
const LAST_STEP_INDEX = TOTAL_STEPS - 1;

function clampOnboardingStep(index: number): number {
  return Math.min(Math.max(0, index), LAST_STEP_INDEX);
}

function mockFile(name: string, mime: string): MockUploadedFile {
  return { fileName: name, mime, uploadedAt: new Date().toISOString() };
}

function UploadChip({
  label,
  value,
  onPick,
  uploading,
}: {
  label: string;
  value?: MockUploadedFile;
  onPick: () => void;
  uploading?: boolean;
}) {
  const fileName = value?.fileName
    ? value.fileName.startsWith("http")
      ? "Uploaded ✓"
      : value.fileName
    : null;

  return (
    <Pressable onPress={onPick} style={styles.uploadChip} disabled={uploading}>
      <Text style={styles.uploadLabel}>{label}</Text>
      {uploading ? (
        <ActivityIndicator size="small" color={colors.orange} />
      ) : (
        <Text style={styles.uploadHint}>
          {fileName ?? (isFirebaseConfigured() ? "Tap to pick image" : "Simulate capture (demo)")}
        </Text>
      )}
    </Pressable>
  );
}

const LICENCE_CATEGORIES = ["A", "B", "C", "C1", "C+E", "D"] as const;

function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = value
    ? value.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  const isCustom = (cat: string) =>
    !(LICENCE_CATEGORIES as readonly string[]).includes(cat);

  const customOther = selected.filter(isCustom).join(", ");

  const toggle = (cat: string) => {
    const next = selected.includes(cat)
      ? selected.filter((c) => c !== cat)
      : [...selected, cat];
    const custom = selected.filter(isCustom);
    onChange([...next.filter((c) => !isCustom(c)), ...custom].join(", "));
  };

  const setOther = (text: string) => {
    const preset = selected.filter((c) => !isCustom(c));
    const extras = text
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    onChange([...preset, ...extras].join(", "));
  };

  return (
    <View style={styles.catCard}>
      <Text style={styles.catCardLabel}>CATEGORIES HELD</Text>
      <View style={styles.catChipsRow}>
        {LICENCE_CATEGORIES.map((cat) => {
          const on = selected.includes(cat);
          return (
            <Pressable
              key={cat}
              onPress={() => toggle(cat)}
              style={[styles.catChip, on && styles.catChipOn]}
            >
              <Text style={[styles.catChipText, on && styles.catChipTextOn]}>
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.catHint}>
        Tap one or more categories. If your licence type is not shown, add it below.
      </Text>
      <View style={styles.catDivider} />
      <Text style={styles.catOtherLabel}>OTHER CATEGORY (OPTIONAL)</Text>
      <TextInput
        style={styles.catOtherInput}
        value={customOther}
        onChangeText={setOther}
        placeholder="e.g. B+E, C1+E, LGV"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
      />
    </View>
  );
}

function TriChip({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.triRow}>
      {(
        [
          ["heavy", ">3.5t laden", true],
          ["light", "≤ 3.5t", false],
        ] as const
      ).map(([key, label, v]) => {
        const on = value === v;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(v)}
            style={[styles.tri, on && styles.triOn]}
          >
            <Text style={[styles.triText, on && styles.triTextOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OperatorOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const {
    operatorProfile,
    patchOperatorProfile,
    setOperatorStep,
    submitOperatorVerification,
    user,
  } = useApp();

  const p = operatorProfile;
  const step = clampOnboardingStep(p?.onboardingStepIndex ?? 0);

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const patch = useCallback(
    (u: Partial<OperatorProfile>) => {
      patchOperatorProfile(u);
    },
    [patchOperatorProfile],
  );

  /** Picks an image and uploads it (real or mock depending on Firebase config). */
  const handleUpload = useCallback(
    async (
      fieldKey: keyof OperatorProfile,
      mockName: string,
      mockMime: string,
    ) => {
      if (isFirebaseConfigured() && user?.id) {
        const asset = await pickDocument();
        if (!asset) return;
        setUploadingField(fieldKey);
        try {
          const file = await uploadOperatorDoc(user.id, fieldKey, asset);
          patch({ [fieldKey]: file } as Partial<OperatorProfile>);
        } catch {
          Alert.alert("Upload failed", "Could not upload file. Please try again.");
        } finally {
          setUploadingField(null);
        }
      } else {
        patch({ [fieldKey]: mockFile(mockName, mockMime) } as Partial<OperatorProfile>);
      }
    },
    [user?.id, patch],
  );

  const goLegal = () =>
    navigation.navigate("Legal", { kind: "operator_contract" });

  const next = () => {
    setOperatorStep(clampOnboardingStep(step + 1));
  };

  const back = () => {
    const n = Math.max(0, step - 1);
    setOperatorStep(n);
  };

  const handleBack = () => {
    if (step > 0) {
      back();
      return;
    }
    navigation.goBack();
  };

  const titles = useMemo(
    () => [
      "Identity & driving licence",
      "Insurance & uploads",
      "Operator licensing (heavy goods)",
      "Recovery vehicle",
      "Masked payout details",
      "Review & submit",
    ],
    [],
  );

  if (!p || user?.role !== "operator") {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <Text style={styles.error}>Operator profile missing.</Text>
      </View>
    );
  }

  const onSubmit = () => {
    const r = submitOperatorVerification();
    if (!r.ok) {
      Alert.alert("Incomplete", r.reason ?? "Check required fields.");
      return;
    }
    Alert.alert(
      "Application sent",
      "RescueLink will verify your documents (backend workflow later). You can approve yourself in dev mode from the pending screen.",
      [{ text: "OK", onPress: () => navigation.popToTop() }],
    );
  };

  const body = (() => {
    switch (step) {
      case 0:
        return (
          <>
            <RLSectionLabel>Personal details</RLSectionLabel>
            <FieldGroup
              fields={[
                {
                  label: "Full legal name",
                  value: p.legalFullName,
                  onChangeText: (t) => patch({ legalFullName: t }),
                },
                {
                  label: "Date of birth",
                  placeholder: "DD / MM / YYYY",
                  value: p.dateOfBirth,
                  onChangeText: (t) => patch({ dateOfBirth: t }),
                  keyboardType: "numeric",
                },
              ]}
            />
            <RLSectionLabel>Address</RLSectionLabel>
            <FieldGroup
              fields={[
                {
                  label: "Address line 1",
                  value: p.addressLine1,
                  onChangeText: (t) => patch({ addressLine1: t }),
                },
                {
                  label: "Postcode",
                  value: p.addressPostcode,
                  onChangeText: (t) => patch({ addressPostcode: t }),
                  autoCapitalize: "characters",
                },
              ]}
            />
            <RLSectionLabel>Licence</RLSectionLabel>
            <FieldGroup
              fields={[
                {
                  label: "Driving licence number",
                  value: p.drivingLicenceNumber,
                  onChangeText: (t) => patch({ drivingLicenceNumber: t }),
                  autoCapitalize: "characters",
                },
              ]}
            />
            <CategoryPicker
              value={p.drivingCategories}
              onChange={(v) => patch({ drivingCategories: v })}
            />
            <FieldGroup
              fields={[
                {
                  label: "Licence expiry",
                  placeholder: "MM/YY",
                  value: p.drivingLicenceExpiry,
                  onChangeText: (t) => patch({ drivingLicenceExpiry: t }),
                  keyboardType: "numeric",
                },
              ]}
            />
            <UploadChip
              label="Licence image"
              value={p.licenceFront}
              uploading={uploadingField === "licenceFront"}
              onPick={() =>
                void handleUpload("licenceFront", "licence-front.jpg", "image/jpeg")
              }
            />
          </>
        );
      case 1:
        return (
          <>
            <RLSectionLabel>Recovery / on-hook insurance</RLSectionLabel>
            <RLField
              label="Insurer"
              value={p.recoveryInsurer}
              onChangeText={(t) => patch({ recoveryInsurer: t })}
            />
            <RLField
              label="Policy number"
              value={p.recoveryPolicyNumber}
              onChangeText={(t) => patch({ recoveryPolicyNumber: t })}
            />
            <RLField
              label="Cover limit GBP (number)"
              keyboardType="number-pad"
              value={
                p.recoveryCoverLimitGbp > 0
                  ? String(p.recoveryCoverLimitGbp)
                  : ""
              }
              onChangeText={(t) =>
                patch({
                  recoveryCoverLimitGbp:
                    Number(String(t).replace(/[^0-9]/g, "")) || 0,
                })
              }
            />
            <RLField
              label="Policy expiry"
              value={p.recoveryPolicyExpiry}
              onChangeText={(t) => patch({ recoveryPolicyExpiry: t })}
            />
            <UploadChip
              label="Recovery policy certificate"
              value={p.recoveryCert}
              uploading={uploadingField === "recoveryCert"}
              onPick={() =>
                void handleUpload("recoveryCert", "recovery-policy.pdf", "application/pdf")
              }
            />
            <RLSectionLabel>Public liability</RLSectionLabel>
            <RLField
              label="Insurer"
              value={p.publicLiabilityInsurer}
              onChangeText={(t) => patch({ publicLiabilityInsurer: t })}
            />
            <RLField
              label="Expiry"
              value={p.publicLiabilityExpiry}
              onChangeText={(t) => patch({ publicLiabilityExpiry: t })}
            />
            <UploadChip
              label="Public liability certificate"
              value={p.publicLiabilityCert}
              uploading={uploadingField === "publicLiabilityCert"}
              onPick={() =>
                void handleUpload("publicLiabilityCert", "public-liability.pdf", "application/pdf")
              }
            />
            <Pressable
              style={styles.checkRow}
              onPress={() => patch({ employsStaff: !p.employsStaff })}
            >
              <View
                style={[styles.checkBox, p.employsStaff && styles.checkBoxOn]}
              />
              <Text style={styles.checkLabel}>
                I employ staff (EL insurance required when true)
              </Text>
            </Pressable>
            {p.employsStaff ? (
              <UploadChip
                label="Employers liability certificate"
                value={p.employerLiabilityCert}
                uploading={uploadingField === "employerLiabilityCert"}
                onPick={() =>
                  void handleUpload("employerLiabilityCert", "employer-liability.pdf", "application/pdf")
                }
              />
            ) : null}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.hint}>
              O-licence style questions mirror UK hire & reward thresholds — not
              legal advice. Collect details when your laden recovery unit exceeds 3.5t.
            </Text>
            <RLSectionLabel>Laden recovery unit over 3.5t?</RLSectionLabel>
            <TriChip
              value={p.towingExceeds3500kg}
              onChange={(v) => patch({ towingExceeds3500kg: v })}
            />
            {p.towingExceeds3500kg === true ? (
              <>
                <RLField
                  label="Operator licence reference"
                  value={p.oLicenceNumber}
                  onChangeText={(t) => patch({ oLicenceNumber: t })}
                />
                <RLField
                  label="Traffic area"
                  value={p.oLicenceTrafficArea}
                  onChangeText={(t) => patch({ oLicenceTrafficArea: t })}
                />
                <RLField
                  label="O-licence expiry"
                  value={p.oLicenceExpiry}
                  onChangeText={(t) => patch({ oLicenceExpiry: t })}
                />
                <UploadChip
                  label="O-licence PDF"
                  value={p.oLicenceScan}
                  uploading={uploadingField === "oLicenceScan"}
                  onPick={() =>
                    void handleUpload("oLicenceScan", "operator-licence.pdf", "application/pdf")
                  }
                />
              </>
            ) : null}
          </>
        );
      case 3:
        return (
          <>
            <RLField
              label="Recovery truck registration (VRM)"
              autoCapitalize="characters"
              value={p.recoveryVehicleReg}
              onChangeText={(t) => patch({ recoveryVehicleReg: t })}
            />
            <RLField
              label="GVW band (describe)"
              placeholder="e.g. 7500 kg"
              value={p.recoveryGvwBand}
              onChangeText={(t) => patch({ recoveryGvwBand: t })}
            />
            <RLSectionLabel>Equipment</RLSectionLabel>
            <Pressable
              style={styles.checkRow}
              onPress={() => patch({ recoveryFlatbed: !p.recoveryFlatbed })}
            >
              <View
                style={[
                  styles.checkBox,
                  p.recoveryFlatbed && styles.checkBoxOn,
                ]}
              />
              <Text style={styles.checkLabel}>Flatbed / slidebed</Text>
            </Pressable>
            <Pressable
              style={styles.checkRow}
              onPress={() => patch({ recoveryWinch: !p.recoveryWinch })}
            >
              <View
                style={[styles.checkBox, p.recoveryWinch && styles.checkBoxOn]}
              />
              <Text style={styles.checkLabel}>Winch-equipped</Text>
            </Pressable>
            <RLField
              label="Years in breakdown / recovery (optional)"
              keyboardType="number-pad"
              value={p.yearsExperience}
              onChangeText={(t) => patch({ yearsExperience: t })}
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.hint}>
              Real apps tokenize bank data via a payments partner. Here we only
              store masked sort pattern and last four digits.
            </Text>
            <RLField
              label="Account holder name"
              value={p.payoutAccountHolder}
              onChangeText={(t) => patch({ payoutAccountHolder: t })}
            />
            <RLField
              label="Sort code (masked display, e.g. ••-••-12)"
              value={p.payoutSortMasked}
              onChangeText={(t) => patch({ payoutSortMasked: t })}
            />
            <RLField
              label="Account last 4 digits"
              keyboardType="number-pad"
              maxLength={4}
              value={p.payoutAccountLast4}
              onChangeText={(t) =>
                patch({
                  payoutAccountLast4: t.replace(/[^0-9]/g, "").slice(0, 4),
                })
              }
            />
          </>
        );
      case 5:
      default:
        return (
          <>
            <Text style={styles.hint}>
              Confirmations are mock-only; backend will run IDV, policy checks,
              and admin review.
            </Text>
            <Text style={styles.summary}>
              {[
                `Name: ${p.legalFullName || "—"}`,
                `Recovery reg: ${p.recoveryVehicleReg || "—"}`,
                `Cover limit: £${p.recoveryCoverLimitGbp || 0}`,
                `Heavy goods pathway: ${p.towingExceeds3500kg === true ? "Yes" : p.towingExceeds3500kg === false ? "No" : "Unset"}`,
                `Submittable checklist: ${isOperatorProfileSubmittable(p) ? "Ready" : "Incomplete"}`,
              ].join("\n")}
            </Text>
            <Pressable
              style={styles.linkRow}
              onPress={() => patch({ confirmAccuracy: !p.confirmAccuracy })}
            >
              <View
                style={[styles.checkBox, p.confirmAccuracy && styles.checkBoxOn]}
              />
              <Text style={styles.checkLabel}>
                I confirm supplied information is accurate to the best of my knowledge.
              </Text>
            </Pressable>
            <Pressable onPress={goLegal}>
              <Text style={styles.inlineLink}>Read operator framework (draft)</Text>
            </Pressable>
          </>
        );
    }
  })();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.headerBack}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <View style={styles.modeRibbon}>
          <Text style={styles.modeRibbonText}>RESCUELINK · DRIVER onboarding</Text>
          <Text style={styles.modeRibbonSub}>
            Separate from the customer booking app (map / jobs / vehicles).
          </Text>
        </View>
        <Text style={styles.screenTitle}>{titles[Math.min(step, titles.length - 1)]}</Text>
        <Text style={styles.stepTag}>
          Step {step + 1} / {TOTAL_STEPS}
        </Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingBottom: insets.bottom + 140,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {body}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + space.md },
        ]}
      >
        <RLButton label="Back" variant="ghost" onPress={handleBack} />
        {step < TOTAL_STEPS - 1 ? (
          <RLButton label="Next step" onPress={next} style={styles.footerBtn} />
        ) : (
          <RLButton
            label="Submit for review"
            onPress={onSubmit}
            style={styles.footerBtn}
          />
        )}
      </View>

      <DevPageBadge
        {...DEV_PAGES.operatorOnboarding}
        suffix={`step ${step + 1}/${TOTAL_STEPS}`}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  topBar: { paddingHorizontal: space.xl, paddingBottom: space.sm },
  headerBack: { alignSelf: "flex-start", marginBottom: space.sm },
  back: { color: colors.orange, fontWeight: "700", fontSize: 16 },
  modeRibbon: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    padding: space.md,
    marginBottom: space.md,
  },
  modeRibbonText: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  modeRibbonSub: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  screenTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  stepTag: { color: colors.textMuted, fontSize: 13 },
  hint: {
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: space.md,
  },
  summary: {
    color: colors.textMuted,
    lineHeight: 22,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    marginBottom: space.lg,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.md,
  },
  footerBtn: { flex: 1 },
  error: { color: colors.red, padding: space.xl },
  uploadChip: {
    borderWidth: 1,
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
    padding: space.md,
    borderRadius: radii.md,
    marginBottom: space.md,
  },
  uploadLabel: { color: colors.white, fontWeight: "700", marginBottom: 4 },
  uploadHint: { color: colors.textMuted, fontSize: 13 },

  // ── Category picker ──
  catCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  catCardLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: space.sm,
  },
  catChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.sm,
  },
  catChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  catChipOn: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  catChipText: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  catChipTextOn: { color: colors.white },
  catHint: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: space.sm,
  },
  catDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: space.sm,
  },
  catOtherLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  catOtherInput: {
    color: colors.text,
    fontSize: 15,
    paddingVertical: 4,
  },
  roleRow: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  roleChip: {
    flex: 1,
    paddingVertical: space.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  roleChipOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  roleChipText: { color: colors.textMuted, fontWeight: "600" },
  roleChipTextOn: { color: colors.white },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: space.md,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: space.lg,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    backgroundColor: colors.surface2,
  },
  checkBoxOn: { backgroundColor: colors.orange },
  checkLabel: { flex: 1, color: colors.textMuted, lineHeight: 20 },
  inlineLink: { color: colors.orange, fontWeight: "600", marginBottom: space.lg },
  triRow: { flexDirection: "row", gap: space.sm, marginBottom: space.lg },
  tri: {
    flex: 1,
    padding: space.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  triOn: { borderColor: colors.borderOrange, backgroundColor: colors.orangeFaint },
  triText: { color: colors.textMuted, textAlign: "center", fontSize: 13 },
  triTextOn: { color: colors.white },
});
