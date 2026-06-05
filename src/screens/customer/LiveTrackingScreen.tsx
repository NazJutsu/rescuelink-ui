import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { buildMockActiveJob } from "../../data/activeJob";
import { useApp } from "../../state/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import { subscribeToJob, confirmInspection, disputeInspection } from "../../firebase/jobService";
import { callUpdateJobStatus } from "../../firebase/functionsService";
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

  // ── Real driver position from Firestore ────────────────────────────────
  useEffect(() => {
    if (!firestoreJob?.driverLat || !firestoreJob?.driverLng) return;
    setDriverLat(firestoreJob.driverLat);
    setDriverLng(firestoreJob.driverLng);
  }, [firestoreJob?.driverLat, firestoreJob?.driverLng]);

  const useLiveTracking = isFirebaseConfigured() && Boolean(jobId);

  // ── Mock GPS animation (demo / offline path only) ─────────────────────
  useEffect(() => {
    if (!displayJob || useLiveTracking) return;
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
  }, [displayJob, insets.top, useLiveTracking]);

  // ── Fit map when live driver position updates ──────────────────────────
  useEffect(() => {
    if (!useLiveTracking || !displayJob) return;
    mapRef.current?.fitToCoordinates(
      [
        { latitude: driverLat, longitude: driverLng },
        { latitude: displayJob.pickupLat, longitude: displayJob.pickupLng },
      ],
      {
        edgePadding: { top: insets.top + 100, right: 44, bottom: 260, left: 44 },
        animated: true,
      },
    );
  }, [useLiveTracking, displayJob, driverLat, driverLng, insets.top]);

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
      void callUpdateJobStatus(jobId, "completed");
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
    { latitude: driverLat, longitude: driverLng },
    { latitude: displayJob.pickupLat, longitude: displayJob.pickupLng },
  ];
  const routeSoFar = useLiveTracking
    ? routeLine
    : progressT >= 1
      ? routeLine
      : [
          { latitude: displayJob.driverLat, longitude: displayJob.driverLng },
          { latitude: driverLat, longitude: driverLng },
        ];

  const [inspConfirming, setInspConfirming] = useState(false);

  const handleConfirmInspection = async () => {
    if (!jobId) return;
    setInspConfirming(true);
    try {
      await confirmInspection(jobId);
    } catch {
      Alert.alert("Error", "Could not confirm. Please try again.");
    } finally {
      setInspConfirming(false);
    }
  };

  const handleDisputeInspection = () => {
    Alert.alert(
      "Dispute condition",
      "Are you sure? The driver will be notified and the job will be cancelled for review.",
      [
        { text: "Back", style: "cancel" },
        {
          text: "Dispute",
          style: "destructive",
          onPress: async () => {
            if (!jobId) return;
            try {
              await disputeInspection(jobId);
            } catch {
              Alert.alert("Error", "Could not raise dispute. Please try again.");
            }
          },
        },
      ],
    );
  };

  const firestoreStatus = firestoreJob?.status;
  const statusTitle =
    firestoreStatus === "inspection_pending"
      ? "Review vehicle condition"
      : firestoreStatus === "arrived"
        ? "Operator has arrived"
        : firestoreStatus === "en_route" || progressT < 0.96
          ? "Operator en route"
          : "Almost at pickup point";

  const etaLabel =
    firestoreStatus === "inspection_pending"
      ? "Please check and confirm the photos below"
      : firestoreStatus === "arrived"
        ? "Arrived at your location"
        : useLiveTracking
          ? firestoreStatus === "en_route"
            ? "Driver en route — live location"
            : "Tracking driver"
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

      <ScrollView
        style={[styles.sheet, { maxHeight: firestoreStatus === "inspection_pending" ? "55%" : undefined }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}
      >
        {/* ── Inspection panel (visible when driver sends photos) ── */}
        {firestoreStatus === "inspection_pending" && firestoreJob?.inspectionPhotos?.length ? (
          <View style={styles.inspectionPanel}>
            <View style={styles.inspectionHeader}>
              <Ionicons name="camera-outline" size={18} color={colors.orange} />
              <Text style={styles.inspectionTitle}>Pre-load vehicle photos</Text>
            </View>
            <Text style={styles.inspectionSubtitle}>
              Your driver has photographed your vehicle. Please check each photo and confirm
              there is no pre-existing damage before they load it.
            </Text>

            {/* 2×2 photo grid */}
            <View style={styles.inspPhotosGrid}>
              {firestoreJob.inspectionPhotos.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={styles.inspPhoto}
                  resizeMode="cover"
                />
              ))}
            </View>

            {firestoreJob.inspectionNotes ? (
              <View style={styles.inspNotes}>
                <Text style={styles.inspNotesLabel}>DRIVER NOTES</Text>
                <Text style={styles.inspNotesText}>{firestoreJob.inspectionNotes}</Text>
              </View>
            ) : null}

            <RLButton
              label="Confirm — no damage ✓"
              onPress={handleConfirmInspection}
              loading={inspConfirming}
              style={styles.confirmBtn}
            />
            <Pressable onPress={handleDisputeInspection} style={styles.disputeRow}>
              <Text style={styles.disputeText}>Dispute condition</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Normal sheet content (hidden during inspection review) */}
        {firestoreStatus !== "inspection_pending" ? (
          <>
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
          </>
        ) : null}
      </ScrollView>
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
  // ── Inspection panel ──
  inspectionPanel: {
    marginBottom: space.md,
  },
  inspectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.xs,
  },
  inspectionTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  inspectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: space.md,
  },
  inspPhotosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs,
    marginBottom: space.md,
  },
  inspPhoto: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.surface2,
  },
  inspNotes: {
    backgroundColor: colors.surface2,
    borderRadius: radii.sm,
    padding: space.md,
    marginBottom: space.md,
  },
  inspNotesLabel: {
    color: colors.textFaint,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  inspNotesText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmBtn: { marginBottom: space.sm },
  disputeRow: { alignItems: "center", paddingVertical: space.sm },
  disputeText: { color: colors.red, fontWeight: "700" },
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
