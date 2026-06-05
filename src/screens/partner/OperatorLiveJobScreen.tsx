import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import { subscribeToJob, type JobDoc } from "../../firebase/jobService";
import { callUpdateJobStatus } from "../../firebase/functionsService";
import { startDriverLocationBroadcast } from "../../services/driverLocation";

export function OperatorLiveJobScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const route = useRoute<RouteProp<CombinedStackParamList, "OperatorLiveJob">>();
  const jobId = route.params?.jobId;

  const [job, setJob] = useState<JobDoc | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Subscribe to the accepted job ─────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured() || !jobId) return;
    const unsub = subscribeToJob(jobId, (j) => {
      setJob(j);
      if (j?.status === "completed") {
        // Navigate back to home once job is complete
        navigation.navigate("OperatorTabs");
      }
    });
    return unsub;
  }, [jobId, navigation]);

  // ── Broadcast live GPS while job is active ──
  useEffect(() => {
    if (!isFirebaseConfigured() || !jobId || !job) return;
    if (job.status === "completed" || job.status === "cancelled") return;

    let stop: (() => void) | undefined;
    void startDriverLocationBroadcast(jobId).then((cleanup) => {
      stop = cleanup;
    });

    return () => stop?.();
  }, [jobId, job?.status]);

  const handleStatusUpdate = async (status: "arrived" | "completed") => {
    if (!jobId) return;
    setUpdating(true);
    try {
      if (isFirebaseConfigured()) {
        await callUpdateJobStatus(jobId, status);
      }
    } catch {
      Alert.alert("Error", "Could not update job status. Try again.");
    } finally {
      setUpdating(false);
    }
  };

  // ── Fallback: no Firebase or no jobId ─────────────────────────────────
  if (!isFirebaseConfigured() || !jobId) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top, paddingHorizontal: space.xl }]}>
        <Text style={styles.title}>Active recovery (demo)</Text>
        <Text style={styles.body}>
          Connect Firebase and accept a real job from the Home screen to see live job controls here.
        </Text>
        <RLButton label="Close" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.flex, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.loadingTxt}>Loading job…</Text>
      </View>
    );
  }

  const statusColor =
    job.status === "arrived" && job.inspectionConfirmedAt
      ? colors.green
      : job.status === "arrived"
        ? colors.orange
        : job.status === "inspection_pending"
          ? colors.orange
          : job.status === "en_route"
            ? colors.orange
            : colors.textMuted;

  const statusLabel =
    job.status === "en_route"
      ? "En route to pickup"
      : job.status === "arrived"
        ? job.inspectionConfirmedAt
          ? "Customer confirmed ✓ — safe to load"
          : "Arrived at pickup"
        : job.status === "inspection_pending"
          ? "Waiting for customer confirmation…"
          : job.status === "completed"
            ? "Job complete"
            : job.status;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom + space.xl * 2,
      }}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Active job</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Status badge */}
      <View style={[styles.statusBadge, { borderColor: statusColor }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* Job details card */}
      <View style={styles.card}>
        <DetailRow icon="person-outline" label="Customer" value={job.customerName} />
        <DetailRow icon="location-outline" label="Pickup" value={job.pickupLabel} />
        {job.dropoffLabel ? (
          <DetailRow icon="flag-outline" label="Drop-off" value={job.dropoffLabel} />
        ) : null}
        <DetailRow icon="construct-outline" label="Issue" value={job.issueLabel} />
        <DetailRow icon="car-outline" label="Vehicle" value={job.vehicleLabel} />
        <DetailRow
          icon="cash-outline"
          label="Your payout"
          value={`£${job.totalGbp.toFixed(2)}`}
          highlight
        />
      </View>

      {/* Action buttons */}
      {job.status === "en_route" ? (
        <RLButton
          label="Mark as arrived"
          onPress={() => void handleStatusUpdate("arrived")}
          loading={updating}
          style={styles.btn}
        />
      ) : null}

      {/* Arrived, no inspection yet — take photos */}
      {job.status === "arrived" && !job.inspectionConfirmedAt ? (
        <RLButton
          label="Take inspection photos →"
          onPress={() => navigation.navigate("DriverInspection", { jobId })}
          style={styles.btn}
        />
      ) : null}

      {/* Waiting for customer to confirm inspection */}
      {job.status === "inspection_pending" ? (
        <View style={styles.waitingBanner}>
          <Ionicons name="hourglass-outline" size={18} color={colors.orange} />
          <Text style={styles.waitingText}>
            Photos sent — waiting for customer to confirm vehicle condition…
          </Text>
        </View>
      ) : null}

      {/* Customer confirmed — driver can complete the job */}
      {job.status === "arrived" && job.inspectionConfirmedAt ? (
        <RLButton
          label="Vehicle loaded — complete job"
          onPress={() =>
            Alert.alert(
              "Complete job",
              "Confirm that the recovery is complete and the customer is satisfied.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Complete",
                  onPress: () => void handleStatusUpdate("completed"),
                },
              ],
            )
          }
          loading={updating}
          style={styles.btn}
        />
      ) : null}

      <Pressable
        onPress={() =>
          Alert.alert("Cancel job", "Cancellation policy will be shown here.")
        }
        style={styles.cancelRow}
      >
        <Text style={styles.cancelTxt}>Cancel job</Text>
      </Pressable>
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.detailIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: "center", justifyContent: "center" },
  loadingTxt: { color: colors.textMuted },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  backLink: { color: colors.orange, fontWeight: "700", fontSize: 16 },
  headerTitle: { color: colors.white, fontWeight: "800", fontSize: 16 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: space.lg,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontWeight: "700", fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.lg,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  detailIcon: { marginTop: 2 },
  detailLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  detailValue: { color: colors.white, fontWeight: "700", marginTop: 2 },
  detailValueHighlight: { color: colors.orange, fontSize: 16 },
  btn: { marginBottom: space.sm },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    backgroundColor: colors.orangeFaint,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  waitingText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  cancelRow: { alignItems: "center", paddingVertical: space.md },
  cancelTxt: { color: colors.red, fontWeight: "700" },
  // Fallback styles
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: space.md,
    marginTop: space.lg,
  },
  body: { color: colors.textMuted, lineHeight: 22, marginBottom: space.xl },
});
