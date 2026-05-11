import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton, RLSectionLabel } from "../../components/ui";
import { buildMockActiveJob, useApp } from "../../context/AppContext";
import { ISSUE_OPTIONS, MOCK_PICKUP_LABEL } from "../../mock/customerSeed";
import { buildMockQuote } from "../../mock/quote";
import type { RootStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

const STEPS = 4;

export function BookingFlowScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { vehicles, beginActiveJob } = useApp();

  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState(
    () => vehicles.find((v) => v.isDefault)?.id ?? vehicles[0]?.id ?? "",
  );
  const [canMove, setCanMove] = useState(true);
  const [issue, setIssue] = useState<string>(ISSUE_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [onMotorway, setOnMotorway] = useState(false);
  const [payMethod, setPayMethod] = useState<"apple" | "card">("apple");
  const [matching, setMatching] = useState(false);
  const [matched, setMatched] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? vehicles[0],
    [vehicleId, vehicles],
  );

  const quote = useMemo(
    () =>
      buildMockQuote({
        distanceMiles: 8.2,
        onMotorway,
        canMove,
      }),
    [onMotorway, canMove],
  );

  useEffect(() => {
    if (step !== 3) return;
    setMatching(true);
    setMatched(false);
    const t = setTimeout(() => {
      setMatching(false);
      setMatched(true);
    }, 2200);
    return () => clearTimeout(t);
  }, [step]);

  const goNext = () => {
    if (step < STEPS - 1) setStep((s) => s + 1);
  };

  const goBackStep = () => {
    if (step > 0) setStep((s) => s - 1);
    else navigation.goBack();
  };

  const startTracking = () => {
    const jobId = `live_${Date.now()}`;
    const vehicleLabel = selectedVehicle
      ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.registration}`
      : "Vehicle";
    beginActiveJob(
      buildMockActiveJob({
        jobId,
        quoteTotal: quote.totalGbp,
        issueLabel: `${issue}${description ? ` — ${description}` : ""}`,
        vehicleLabel,
      }),
    );
    navigation.replace("LiveTracking");
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={goBackStep} hitSlop={12}>
          <Text style={styles.back}>{step > 0 ? "Back" : "Close"}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Book recovery</Text>
        <Text style={styles.stepCount}>
          {step + 1}/{STEPS}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / STEPS) * 100}%` },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 0 && (
          <>
            <RLSectionLabel>Step 1 — Location & vehicle</RLSectionLabel>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pickup</Text>
              <Text style={styles.cardBody}>{MOCK_PICKUP_LABEL}</Text>
              <Text style={[styles.cardTitle, { marginTop: space.md }]}>
                Can the vehicle move?
              </Text>
              <View style={styles.rowBetween}>
                <Text style={styles.cardBody}>
                  {canMove ? "Yes — rolling tow" : "No — lift required"}
                </Text>
                <Switch value={canMove} onValueChange={setCanMove} />
              </View>
            </View>
            <RLSectionLabel>Vehicle</RLSectionLabel>
            {vehicles.map((v) => {
              const on = v.id === vehicleId;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => setVehicleId(v.id)}
                  style={[styles.vehicleRow, on && styles.vehicleRowOn]}
                >
                  <View>
                    <Text style={styles.vehicleTitle}>
                      {v.make} {v.model}{" "}
                      {v.isEv ? (
                        <Text style={styles.evBadge}>EV</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.vehicleSub}>
                      {v.registration} · {v.year}
                    </Text>
                  </View>
                  {v.isDefault ? (
                    <Text style={styles.defaultPill}>Default</Text>
                  ) : null}
                </Pressable>
              );
            })}
            <RLButton label="Continue" onPress={goNext} style={styles.cta} />
          </>
        )}

        {step === 1 && (
          <>
            <RLSectionLabel>Step 2 — Issue</RLSectionLabel>
            <View style={styles.chips}>
              {ISSUE_OPTIONS.map((opt) => {
                const on = issue === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => setIssue(opt)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <RLSectionLabel>Description</RLSectionLabel>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Anything the operator should know…"
              placeholderTextColor={colors.textFaint}
              value={description}
              onChangeText={setDescription}
            />
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: space.md }}>
                <Text style={styles.cardTitle}>Motorway / high-speed road</Text>
                <Text style={styles.cardBody}>Applies a surcharge in pricing.</Text>
              </View>
              <Switch value={onMotorway} onValueChange={setOnMotorway} />
            </View>
            <RLButton label="Continue" onPress={goNext} style={styles.cta} />
          </>
        )}

        {step === 2 && (
          <>
            <RLSectionLabel>Step 3 — Upfront price</RLSectionLabel>
            <View style={styles.card}>
              <Row label="Base call-out" value={`£${quote.baseGbp.toFixed(2)}`} />
              <Row label="Distance (est.)" value={`£${quote.distanceGbp.toFixed(2)}`} />
              <Row
                label="Motorway surcharge"
                value={`£${quote.motorwaySurchargeGbp.toFixed(2)}`}
              />
              <View style={styles.divider} />
              <Row label="Subtotal" value={`£${quote.subtotalGbp.toFixed(2)}`} muted />
              <Row label="VAT (20%)" value={`£${quote.vatGbp.toFixed(2)}`} muted />
              <View style={styles.divider} />
              <Row label="Total due" value={`£${quote.totalGbp.toFixed(2)}`} strong />
            </View>
            <RLSectionLabel>Payment method</RLSectionLabel>
            <Pressable
              onPress={() => setPayMethod("apple")}
              style={[styles.payRow, payMethod === "apple" && styles.payRowOn]}
            >
              <Text style={styles.payTitle}>Apple Pay</Text>
              <Text style={styles.paySub}>Fast checkout (mock)</Text>
            </Pressable>
            <Pressable
              onPress={() => setPayMethod("card")}
              style={[styles.payRow, payMethod === "card" && styles.payRowOn]}
            >
              <Text style={styles.payTitle}>Card</Text>
              <Text style={styles.paySub}>Visa •••• 4242</Text>
            </Pressable>
            <RLButton label="Continue" onPress={goNext} style={styles.cta} />
          </>
        )}

        {step === 3 && (
          <>
            <RLSectionLabel>Step 4 — Operator matching</RLSectionLabel>
            <View style={styles.card}>
              {matching && (
                <View style={styles.center}>
                  <ActivityIndicator color={colors.orange} size="large" />
                  <Text style={styles.status}>Finding the nearest verified operator…</Text>
                </View>
              )}
              {matched && !matching && (
                <View>
                  <Text style={styles.matchedTitle}>James M. accepted</Text>
                  <Text style={styles.cardBody}>
                    Flatbed available · ETA {6} min · Upfront total £
                    {quote.totalGbp.toFixed(2)}
                  </Text>
                  <RLButton
                    label="View live tracking"
                    onPress={startTracking}
                    style={{ marginTop: space.lg }}
                  />
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <View style={styles.rowBetween}>
      <Text
        style={[
          styles.rowLabel,
          muted && { color: colors.textMuted },
          strong && { color: colors.white, fontWeight: "800" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          muted && { color: colors.textMuted },
          strong && { color: colors.orange, fontWeight: "800", fontSize: 18 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  back: { color: colors.orange, fontWeight: "700", fontSize: 16 },
  headerTitle: { color: colors.white, fontWeight: "800", fontSize: 16 },
  stepCount: { color: colors.textMuted, fontWeight: "700" },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surface3,
    marginHorizontal: space.xl,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: space.lg,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.orange,
  },
  scroll: { paddingHorizontal: space.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
  },
  cardTitle: { color: colors.white, fontWeight: "700", marginBottom: 4 },
  cardBody: { color: colors.textMuted, lineHeight: 20 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
  },
  vehicleRowOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  vehicleTitle: { color: colors.white, fontWeight: "700" },
  vehicleSub: { color: colors.textMuted, marginTop: 4 },
  evBadge: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 11,
    textTransform: "uppercase",
  },
  defaultPill: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  chipOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  chipText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  chipTextOn: { color: colors.white },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    color: colors.text,
    marginBottom: space.lg,
  },
  payRow: {
    padding: space.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
  },
  payRowOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  payTitle: { color: colors.white, fontWeight: "700" },
  paySub: { color: colors.textMuted, marginTop: 4 },
  cta: { marginTop: space.md },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space.sm,
  },
  rowLabel: { color: colors.text },
  rowValue: { color: colors.white, fontWeight: "700" },
  center: { alignItems: "center", paddingVertical: space.xl },
  status: { color: colors.textMuted, marginTop: space.lg, textAlign: "center" },
  matchedTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 20,
    marginBottom: space.sm,
  },
});
