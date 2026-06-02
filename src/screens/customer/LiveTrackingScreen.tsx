import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton } from "../../components/ui";
import { buildMockActiveJob } from "../../data/activeJob";
import { useApp } from "../../state/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import { subscribeToJob, updateJobStatus } from "../../firebase/jobService";
import type { JobDoc } from "../../firebase/jobService";
import type { ActiveJob } from "../../types";

const MOCK_TICKETS = 40;
const MOCK_TICK_MS = 800;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Maps a Firestore job doc to the ActiveJob shape used by the existing map UI. */
function jobDocToActiveJob(job: JobDoc): ActiveJob {
  const driverLat = job.driverLat ?? (job.pickupLat + 0.006);
  const driverLng = job.driverLng ?? (job.pickupLng - 0.013);
  return {
    id: job.id,
    customerName: job.customerName,
    operatorName: job.driverName ?? "Finding operator…",
    operatorRating: 4.9,
    vehicleLabel: job.vehicleLabel,
    issueLabel: job.issueLabel,
    totalGbp: job.totalGbp,
    etaMinutes: 6,
    status: job.status,
    pickupLat: job.pickupLat,
    pickupLng: job.pickupLng,
    driverLat,
    driverLng,
  };
}

export function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const route = useRoute<RouteProp<CombinedStackParamList, "LiveTracking">>();
  const jobId = route.params?.jobId;

  const {
    activeJob,
    beginActiveJob,
    clearActiveJob,
    completeActiveJob,
  } = useApp();

  // Firebase-backed job state (overrides activeJob when configured)
  const [firestoreJob, setFirestoreJob] = useState<JobDoc | null>(null);

  const mapRef = useRef<MapView>(null);
  const [driverLat, setDriverLat] = useState(activeJob?.driverLat ?? 51.53);
  const [driverLng, setDriverLng] = useState(activeJob?.driverLng ?? -0.09);
  const [eta, setEta] = useState(activeJob?.etaMinutes ?? 6);
  const [progressT, setProgressT] = useState(0);
  const tick = useRef(0);

  // ── Firestore subscription (Firebase path) ─────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured() || !jobId) return;

    const unsub = subscribeToJob(jobId, (job) => {
      setFirestoreJob(job);
      if (job?.status === "completed") {
        // Auto-navigate when driver marks job complete
        completeActiveJob({
          id: job.id,
          createdAt: new Date().toISOString(),
          status: "completed",
          operatorName: job.driverName ?? "Operator",
          amountGbp: job.totalGbp,
          pickupLabel: job.pickupLabel,
          vehicleReg: job.vehicleLabel.split("·").pop()?.trim() ?? "—",
        });
        clearActiveJob();
        navigation.navigate("MainTabs", { screen: "JobHistory" });
      }
    });

    return unsub;
  }, [jobId, completeActiveJob, clearActiveJob, navigation]);

  // Resolve which job to display — prefer Firestore job when available
  const displayJob: ActiveJob | null = firestoreJob
    ? jobDocToActiveJob(firestoreJob)
    : activeJob;

  // ── Mock GPS animation (runs when displayJob is set) ───────────────────
  useEffect(() => {
    if (!displayJob) return;
    tick.current = 0;
    setDriverLat(displayJob.driverLat);
    setDriverLng(displayJob.driverLng);
    setEta(displayJob.etaMinutes);
    setProgressT(0);

    const initialFit = () => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: displayJob.driverLat, longitude: displayJob.driverLng },
          { latitude: displayJob.pickupLat, longitude: displayJob.pickupLng },
        ],
        {
          edgePadding: { top: insets.top + 100, right: 44, bottom: 260, left: 44 },
          animated: false,
        },
      );
    };
    requestAnimationFrame(initialFit);

    const id = setInterval(() => {
      tick.current += 1;
      const t = Math.min(1, tick.current / MOCK_TICKETS);
      setProgressT(t);
      setDriverLat(lerp(displayJob.driverLat, displayJob.pickupLat, t));
      setDriverLng(lerp(displayJob.driverLng, displayJob.pickupLng, t));
      setEta(Math.max(1, Math.round(displayJob.etaMinutes * (1 - t))));

      if (tick.current % 4 === 0) {
        mapRef.current?.fitToCoordinates(
          [
            {
              latitude: lerp(displayJob.driverLat, displayJob.pickupLat, t),
              longitude: lerp(displayJob.driverLng, displayJob.pickupLng, t),
            },
            { latitude: displayJob.pickupLat, longitude: displayJob.pickupLng },
          ],
          {
            edgePadding: { top: insets.top + 100, right: 44, bottom: 260, left: 44 },
            animated: true,
          },
        );
      }
    }, MOCK_TICK_MS);

    return () => clearInterval(id);
  }, [displayJob, insets.top]);

  const startTrackingDemo = () => {
    beginActiveJob(
      buildMockActiveJob({
        jobId: `demo_track_${Date.now()}`,
        quoteTotal: 98.5,
        issueLabel: "Demo breakdown — mocked driver movement toward pickup",
        vehicleLabel: "Ford Focus · AB21 CDE",
      }),
    );
  };

  if (!displayJob) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>
          {isFirebaseConfigured() && jobId
            ? "Loading job details…"
            : "Nothing is being tracked right now — this screen is wired for demos with a fake GPS path (straight line toward pickup, no backend)."}
        </Text>
        {!isFirebaseConfigured() || !jobId ? (
          <>
            <RLButton label="Run live tracking demo" onPress={startTrackingDemo} />
            <View style={{ height: space.md }} />
            <Pressable onPress={() => navigation.navigate("MainTabs")} hitSlop={12}>
              <Text style={styles.linkBack}>Back to home</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    );
  }

  const markComplete = () => {
    if (isFirebaseConfigured() && jobId) {
      void updateJobStatus(jobId, "completed");
      // Firestore subscription handles navigation
    } else {
      completeActiveJob({
        id: displayJob.id,
        createdAt: new Date().toISOString(),
        status: "completed",
        operatorName: displayJob.operatorName,
        amountGbp: displayJob.totalGbp,
        pickupLabel: "Shoreditch area (mock)",
        vehicleReg: displayJob.vehicleLabel.split("·").pop()?.trim() ?? "—",
      });
      clearActiveJob();
      navigation.navigate("MainTabs", { screen: "JobHistory" });
    }
  };

  const initialRegion = {
    latitude: (displayJob.driverLat + displayJob.pickupLat) / 2,
    longitude: (displayJob.driverLng + displayJob.pickupLng) / 2,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const routeLine = [
    { latitude: displayJob.driverLat, longitude: displayJob.driverLng },
    { latitude: displayJob.pickupLat, longitude: displayJob.pickupLng },
  ];
  const routeSoFar =
    progressT >= 1
      ? routeLine
      : [
          { latitude: displayJob.driverLat, longitude: displayJob.driverLng },
          { latitude: driverLat, longitude: driverLng },
        ];

  const firestoreStatus = firestoreJob?.status;
  const statusTitle =
    firestoreStatus === "arrived"
      ? "Operator has arrived"
      : firestoreStatus === "en_route" || progressT < 0.96
        ? "Operator en route"
        : "Almost at pickup point";

  const etaLabel =
    firestoreStatus === "arrived"
      ? "Arrived at your location"
      : `ETA ~${eta} min`;

  return (
    <View style={styles.flex}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        <Polyline
          coordinates={routeLine}
          strokeColor="rgba(249,115,22,0.35)"
          strokeWidth={10}
          lineDashPattern={Platform.OS === "ios" ? [12, 8] : undefined}
        />
        <Polyline
          coordinates={routeSoFar}
          strokeColor={colors.orange}
          strokeWidth={3}
        />
        <Marker
          coordinate={{ latitude: displayJob.pickupLat, longitude: displayJob.pickupLng }}
          title="Pickup"
          pinColor={colors.green}
        />
        <Marker
          coordinate={{ latitude: driverLat, longitude: driverLng }}
          title={displayJob.operatorName}
          description={isFirebaseConfigured() ? "Recovery operator" : "Recovery truck (mock GPS)"}
          pinColor={colors.orange}
        />
      </MapView>

      <View style={[styles.banner, { top: insets.top + space.sm }]}>
        <Text style={styles.bannerText}>{statusTitle}</Text>
        <Text style={styles.bannerEta}>{etaLabel}</Text>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <Text style={styles.driverName}>{displayJob.operatorName}</Text>
        <Text style={styles.rating}>
          ★ {displayJob.operatorRating.toFixed(1)} · RescueLink Pro
        </Text>
        <Text style={styles.meta}>{displayJob.vehicleLabel}</Text>
        <Text style={styles.issue}>{displayJob.issueLabel}</Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => Linking.openURL("tel:+447700900321")}
          >
            <Text style={styles.iconBtnText}>Call</Text>
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => Alert.alert("Messages", "In-app chat coming soon.")}
          >
            <Text style={styles.iconBtnText}>Message</Text>
          </Pressable>
        </View>

        <RLButton
          label="Mark job complete"
          onPress={markComplete}
          style={{ marginTop: space.md }}
        />
        <Pressable
          onPress={() =>
            Alert.alert("Cancel job", "Cancellation policy will be shown here.")
          }
        >
          <Text style={styles.cancel}>Cancel job</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  banner: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    padding: space.md,
  },
  bannerText: { color: colors.white, fontWeight: "800" },
  bannerEta: { color: colors.orange, fontWeight: "700", marginTop: 4 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
  },
  driverName: { color: colors.white, fontSize: 22, fontWeight: "800" },
  rating: { color: colors.textMuted, marginTop: 4 },
  meta: { color: colors.text, marginTop: space.md, fontWeight: "600" },
  issue: { color: colors.textMuted, marginTop: space.xs, lineHeight: 20 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  iconBtn: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center",
  },
  iconBtnText: { color: colors.orange, fontWeight: "800" },
  cancel: {
    color: colors.red,
    fontWeight: "700",
    textAlign: "center",
    marginTop: space.lg,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.xl,
    justifyContent: "center",
  },
  emptyText: {
    color: colors.textMuted,
    marginBottom: space.lg,
    lineHeight: 22,
    fontSize: 15,
  },
  linkBack: {
    color: colors.orange,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
});
