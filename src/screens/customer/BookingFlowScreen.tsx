import React, { useMemo, useState } from "react";
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton, RLSectionLabel } from "../../components/ui";
import { useApp } from "../../state/AppContext";
import { ISSUE_OPTIONS, MOCK_PICKUP_LABEL } from "../../data/customerSeed";
import { buildMockQuote } from "../../data/quote";
import { buildMockActiveJob } from "../../data/activeJob";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import { createJob } from "../../firebase/jobService";

const SCROLLBAR_TRACK_W = 4;
const SCROLLBAR_GAP = 8;
const SCROLLBAR_THUMB_MIN = 28;

export function BookingFlowScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const route = useRoute<RouteProp<CombinedStackParamList, "BookingFlow">>();
  const { user, vehicles, beginActiveJob } = useApp();
  const [submitting, setSubmitting] = useState(false);

  const pickupDisplay =
    route.params?.pickupLabel?.trim() || MOCK_PICKUP_LABEL;
  const dropoffFromHome = route.params?.dropoffLabel?.trim();

  const roadMiles = route.params?.roadMiles;
  const onMotorway = route.params?.onMotorway ?? false;
  const pickupLat = route.params?.pickupLat;
  const pickupLng = route.params?.pickupLng;

  const [vehicleId, setVehicleId] = useState(
    () => vehicles.find((v) => v.isDefault)?.id ?? vehicles[0]?.id ?? "",
  );
  const [canMove, setCanMove] = useState(true);
  const [issue, setIssue] = useState<string>(ISSUE_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [payMethod, setPayMethod] = useState<"apple" | "card">("apple");
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? vehicles[0],
    [vehicleId, vehicles],
  );

  const vehicleLabel = selectedVehicle
    ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.registration}`
    : "Vehicle";

  const issueLabel = useMemo(() => {
    const extra = description.trim();
    return extra.length > 0 ? `${issue} — ${extra}` : issue;
  }, [description, issue]);

  const quote = useMemo(
    () =>
      buildMockQuote({
        distanceMiles:
          typeof roadMiles === "number" && Number.isFinite(roadMiles)
            ? roadMiles
            : 8.2,
        onMotorway,
        canMove,
      }),
    [canMove, roadMiles, onMotorway],
  );

  const submit = async () => {
    if (isFirebaseConfigured() && user) {
      setSubmitting(true);
      try {
        const jobId = await createJob({
          customerId: user.id,
          customerName: user.firstName,
          vehicleLabel,
          issueLabel,
          canMove,
          pickupLat: typeof pickupLat === "number" ? pickupLat : 51.5245,
          pickupLng: typeof pickupLng === "number" ? pickupLng : -0.0772,
          pickupLabel: pickupDisplay,
          dropoffLabel: dropoffFromHome,
          totalGbp: quote.totalGbp,
        });
        navigation.replace("LiveTracking", { jobId });
      } catch {
        Alert.alert("Error", "Could not create job. Please try again.");
      } finally {
        setSubmitting(false);
      }
    } else {
      beginActiveJob(
        buildMockActiveJob({
          jobId: `live_${Date.now()}`,
          quoteTotal: quote.totalGbp,
          issueLabel,
          vehicleLabel,
          pickupLat,
          pickupLng,
        }),
      );
      navigation.replace("LiveTracking");
    }
  };

  const maxScroll = Math.max(0, contentHeight - viewportHeight);
  const showScrollbar =
    viewportHeight > 0 && contentHeight > viewportHeight + 2;
  const trackInnerH = Math.max(0, viewportHeight - 4);
  const thumbHeight = showScrollbar
    ? Math.max(
        SCROLLBAR_THUMB_MIN,
        Math.round((viewportHeight / contentHeight) * trackInnerH),
      )
    : 0;
  const thumbTravel = Math.max(0, trackInnerH - thumbHeight);
  const scrollClamped =
    maxScroll <= 0 ? 0 : Math.min(Math.max(0, scrollY), maxScroll);
  const thumbTop =
    maxScroll <= 0 ? 2 : 2 + (scrollClamped / maxScroll) * thumbTravel;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(e.nativeEvent.contentOffset.y);
  };

  const scrollPadRight =
    space.xl +
    (showScrollbar
      ? SCROLLBAR_TRACK_W + SCROLLBAR_GAP + Math.max(insets.right, space.sm)
      : 0);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Book recovery</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.scrollWrap}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: insets.bottom + space.xl,
              paddingRight: scrollPadRight,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, h) => setContentHeight(h)}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
        <Text style={styles.lead}>
          Review your trip, vehicle, and issue, then confirm to open live tracking.
        </Text>

        <RLSectionLabel>Trip</RLSectionLabel>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pickup</Text>
          <Text style={styles.cardBody}>{pickupDisplay}</Text>
          {dropoffFromHome ? (
            <>
              <Text style={[styles.cardTitle, { marginTop: space.md }]}>
                Drop-off
              </Text>
              <Text style={styles.cardBody}>{dropoffFromHome}</Text>
            </>
          ) : null}
          <Text style={[styles.cardTitle, { marginTop: space.md }]}>
            Can the vehicle move?
          </Text>
          <Text style={[styles.cardBody, { marginBottom: space.md }]}>
            Yes if it can roll for a tow; No if it needs a flatbed / lift.
          </Text>
          <View style={styles.yesNoRow}>
            <Pressable
              onPress={() => setCanMove(true)}
              style={[styles.yesNoChoice, canMove === true && styles.yesNoChoiceOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: canMove === true }}
            >
              <Text style={[styles.yesNoLabel, canMove === true && styles.yesNoLabelOn]}>
                Yes
              </Text>
              <Text style={[styles.yesNoHint, canMove === true && styles.yesNoHintOn]}>
                Rolling tow
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCanMove(false)}
              style={[styles.yesNoChoice, canMove === false && styles.yesNoChoiceOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: canMove === false }}
            >
              <Text style={[styles.yesNoLabel, canMove === false && styles.yesNoLabelOn]}>
                No
              </Text>
              <Text style={[styles.yesNoHint, canMove === false && styles.yesNoHintOn]}>
                Lift required
              </Text>
            </Pressable>
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
                  {v.isEv ? <Text style={styles.evBadge}>EV</Text> : null}
                </Text>
                <Text style={styles.vehicleSub}>
                  {v.registration} · {v.year}
                </Text>
              </View>
              {v.isDefault ? <Text style={styles.defaultPill}>Default</Text> : null}
            </Pressable>
          );
        })}

        <RLSectionLabel>What’s the issue?</RLSectionLabel>
        <View style={styles.chips}>
          {ISSUE_OPTIONS.map((opt) => {
            const on = issue === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setIssue(opt)}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt}</Text>
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

        <RLSectionLabel>Upfront price</RLSectionLabel>
        <View style={styles.card}>
          <Row label="Base call-out" value={`£${quote.baseGbp.toFixed(2)}`} />
          <Row label="Distance (est.)" value={`£${quote.distanceGbp.toFixed(2)}`} />
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

        <RLButton label="Confirm & start tracking" onPress={submit} style={styles.cta} loading={submitting} />
        </ScrollView>

        {showScrollbar ? (
          <View
            style={[
              styles.scrollbarTrack,
              { right: Math.max(insets.right, space.sm) },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.scrollbarThumb, { height: thumbHeight, top: thumbTop }]} />
          </View>
        ) : null}
      </View>
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
  scrollWrap: { flex: 1, position: "relative" },
  scrollView: { flex: 1 },
  scrollbarTrack: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SCROLLBAR_TRACK_W,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    opacity: 0.5,
    overflow: "hidden",
  },
  scrollbarThumb: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.orange,
  },
  scroll: { paddingHorizontal: space.xl },
  lead: {
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: space.lg,
    fontSize: 15,
  },
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
  yesNoRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  yesNoChoice: {
    flex: 1,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center",
  },
  yesNoChoiceOn: {
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  yesNoLabel: {
    color: colors.textMuted,
    fontWeight: "800",
    fontSize: 17,
  },
  yesNoLabelOn: { color: colors.white },
  yesNoHint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  yesNoHintOn: { color: colors.textMuted },
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.lg,
  },
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
});
