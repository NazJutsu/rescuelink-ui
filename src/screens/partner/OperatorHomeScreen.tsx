import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../../state/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import type { VerificationStatus } from "../../types";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import {
  subscribeToOpenJobs,
  acceptJob,
  type JobDoc,
} from "../../firebase/jobService";

const MOCK_OFFERS = [
  {
    id: "1",
    payout: "£89.40",
    area: "Pickup · Hoxton",
    kit: "Flatbed + winch",
    issueLabel: "Flat tyre",
    canMove: true,
  },
  {
    id: "2",
    payout: "£62.00",
    area: "Pickup · Stratford",
    kit: "Winch only",
    issueLabel: "Won't start",
    canMove: false,
  },
];

function GateCard({
  status,
  navigation,
}: {
  status: VerificationStatus;
  navigation: ReturnType<typeof useNavigation<NativeStackNavigationProp<CombinedStackParamList>>>;
}) {
  const isPending = status === "pending_review";
  const isRejected = status === "rejected";

  const title = isPending
    ? "Application under review"
    : isRejected
      ? "Action needed"
      : "Complete your profile to accept jobs";

  const body = isPending
    ? "Our compliance team is reviewing your documents. You'll be notified once approved."
    : isRejected
      ? "Your application needs updates. Tap below to see the compliance notes and resubmit."
      : "Upload your documents and complete compliance onboarding to go available and start earning.";

  const ctaLabel = isPending
    ? "View application status"
    : isRejected
      ? "Review & resubmit"
      : "Continue onboarding";

  const handleCta = () => {
    if (isPending) navigation.navigate("OperatorPending");
    else if (isRejected) navigation.navigate("OperatorRejected");
    else navigation.navigate("OperatorOnboarding");
  };

  return (
    <View style={styles.gateCard}>
      <Ionicons
        name={isPending ? "time-outline" : isRejected ? "alert-circle-outline" : "document-text-outline"}
        size={36}
        color={isPending ? "#60a5fa" : isRejected ? colors.red : colors.orange}
        style={{ marginBottom: space.sm }}
      />
      <Text style={styles.gateTitle}>{title}</Text>
      <Text style={styles.gateBody}>{body}</Text>
      <Pressable
        style={[styles.gateCta, isRejected && styles.gateCtaRed]}
        onPress={handleCta}
      >
        <Text style={[styles.gateCtaTxt, isRejected && { color: colors.red }]}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function OperatorHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { user, operatorProfile } = useApp();
  const verificationStatus = operatorProfile?.verificationStatus ?? "incomplete_docs";
  const isApproved = verificationStatus === "approved";
  const [available, setAvailable] = useState(false);
  const [openJobs, setOpenJobs] = useState<JobDoc[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  const firstName = user?.firstName?.trim() ?? "Partner";

  // ── Subscribe to open jobs when driver goes available (approved only) ──
  useEffect(() => {
    if (!available || !isApproved || !isFirebaseConfigured()) return;

    const unsub = subscribeToOpenJobs((jobs) => {
      setOpenJobs(jobs);
    });

    return () => {
      unsub();
      setOpenJobs([]);
    };
  }, [available]);

  const handleAccept = async (job: JobDoc) => {
    if (!user) return;
    setAccepting(job.id);
    try {
      await acceptJob(job.id, user.id, user.firstName);
      navigation.navigate("OperatorLiveJob", { jobId: job.id });
    } catch {
      setAccepting(null);
    }
  };

  const renderJobCard = (job: JobDoc) => (
    <View key={job.id} style={styles.offerCard}>
      <View style={styles.offerTop}>
        <Text style={styles.offerPay}>£{job.totalGbp.toFixed(2)}</Text>
        <Text style={styles.offerMeta}>Open offer</Text>
      </View>
      <Text style={styles.offerLine}>
        {job.canMove ? "Rolling tow" : "Lift required"} · {job.pickupLabel}
      </Text>
      <Text style={styles.offerKit}>{job.issueLabel}</Text>
      <Text style={styles.offerVehicle}>{job.vehicleLabel}</Text>
      <View style={styles.offerBtns}>
        <Pressable style={styles.btnDecline} onPress={() => {}} accessibilityRole="button">
          <Text style={styles.btnDeclineTxt}>Decline</Text>
        </Pressable>
        <Pressable
          style={[styles.btnAccept, accepting === job.id && { opacity: 0.6 }]}
          onPress={() => void handleAccept(job)}
          disabled={accepting === job.id}
          accessibilityRole="button"
        >
          {accepting === job.id ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.btnAcceptTxt}>Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  const renderMockCard = (o: (typeof MOCK_OFFERS)[number]) => (
    <View key={o.id} style={styles.offerCard}>
      <View style={styles.offerTop}>
        <Text style={styles.offerPay}>{o.payout}</Text>
        <Text style={styles.offerMeta}>Open offer (demo)</Text>
      </View>
      <Text style={styles.offerLine}>{o.area}</Text>
      <Text style={styles.offerKit}>{o.issueLabel}</Text>
      <View style={styles.offerBtns}>
        <Pressable style={styles.btnDecline} onPress={() => {}} accessibilityRole="button">
          <Text style={styles.btnDeclineTxt}>Decline</Text>
        </Pressable>
        <Pressable
          style={styles.btnAccept}
          onPress={() => navigation.navigate("OperatorLiveJob")}
          accessibilityRole="button"
        >
          <Text style={styles.btnAcceptTxt}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingHorizontal: space.lg,
        paddingBottom: insets.bottom + space.xl * 2,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.partnerMark}>RescueLink Partner</Text>
          <Text style={styles.hi}>Hi, {firstName}</Text>
        </View>
        <Pressable hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {!isApproved ? (
        <GateCard status={verificationStatus} navigation={navigation} />
      ) : (
        <>
      <Pressable
        onPress={() => setAvailable((v) => !v)}
        style={({ pressed }) => [
          styles.availHero,
          available ? styles.availHeroOn : styles.availHeroOff,
          pressed && { opacity: 0.92 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.availTitle, available && styles.availTitleOn]}>
            {available ? "You're available" : "You're unavailable"}
          </Text>
          <Text style={styles.availSub}>
            {available
              ? "New offers surface to available partners — you choose what you accept."
              : "Tap to go available when you want to see offers."}
          </Text>
        </View>
        <View style={[styles.availKnobOuter, available && styles.availKnobOuterOn]}>
          <View style={[styles.availKnob, available && styles.availKnobOn]} />
        </View>
      </Pressable>

      <View style={styles.statsRow}>
        <StatChip label="Today est." value={available ? "£0.00" : "—"} />
        <StatChip label="Completed" value="0" />
        <StatChip label="Session" value={available ? "Active" : "—"} />
      </View>

      {available ? (
        <>
          <Text style={styles.sectionHdr}>Incoming requests</Text>
          <Text style={styles.sectionMuted}>
            Offers are not ranked by distance — review payout, pickup, and issue, then accept when
            it works for you.
          </Text>

          {isFirebaseConfigured() ? (
            openJobs.length === 0 ? (
              <View style={styles.noJobs}>
                <Ionicons name="hourglass-outline" size={32} color={colors.textFaint} />
                <Text style={styles.noJobsTxt}>No open requests right now</Text>
              </View>
            ) : (
              openJobs.map(renderJobCard)
            )
          ) : (
            MOCK_OFFERS.map(renderMockCard)
          )}
        </>
      ) : (
        <View style={styles.emptyAvail}>
          <Ionicons name="walk-outline" size={36} color={colors.textFaint} />
          <Text style={styles.emptyAvailTitle}>Nothing to show yet</Text>
          <Text style={styles.emptyAvailTxt}>
            Go available to see recovery offers — taking a job depends on accepting it, not
            chasing the nearest postcode.
          </Text>
        </View>
      )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: space.lg,
  },
  partnerMark: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  hi: { color: colors.white, fontSize: 26, fontWeight: "800", marginTop: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  availHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.lg,
    borderRadius: radii.lg,
    marginBottom: space.md,
    borderWidth: 1,
    minHeight: 100,
    gap: space.md,
  },
  availHeroOff: { backgroundColor: colors.surface, borderColor: colors.border },
  availHeroOn: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  availTitle: { color: colors.textMuted, fontSize: 20, fontWeight: "800" },
  availTitleOn: { color: colors.green },
  availSub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: space.xs,
  },
  availKnobOuter: {
    width: 54,
    height: 30,
    borderRadius: 16,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 3,
    alignSelf: "center",
  },
  availKnobOuterOn: {
    backgroundColor: "rgba(34,197,94,0.25)",
    borderColor: colors.green,
    alignItems: "flex-end",
  },
  availKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textFaint,
  },
  availKnobOn: { backgroundColor: colors.green },
  statsRow: { flexDirection: "row", gap: space.sm, marginTop: space.sm, marginBottom: space.lg },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { color: colors.textFaint, fontSize: 11, fontWeight: "600" },
  statValue: { color: colors.white, fontSize: 16, fontWeight: "800", marginTop: 4 },
  sectionHdr: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: space.xs,
  },
  sectionMuted: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: space.md,
    lineHeight: 18,
  },
  noJobs: {
    alignItems: "center",
    paddingVertical: space.xl,
    gap: space.sm,
  },
  noJobsTxt: { color: colors.textMuted, fontWeight: "600" },
  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
  },
  offerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  offerPay: { color: colors.orange, fontSize: 22, fontWeight: "900" },
  offerMeta: { color: colors.textMuted, fontWeight: "700" },
  offerLine: { color: colors.white, fontWeight: "700", marginTop: space.sm, fontSize: 16 },
  offerKit: { color: colors.textMuted, marginTop: 4, fontSize: 14 },
  offerVehicle: { color: colors.textFaint, marginTop: 4, fontSize: 13 },
  offerBtns: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  btnDecline: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  btnDeclineTxt: { color: colors.textMuted, fontWeight: "800" },
  btnAccept: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.green,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnAcceptTxt: { color: colors.white, fontWeight: "800" },
  emptyAvail: {
    alignItems: "center",
    paddingVertical: space.xl + space.lg,
    paddingHorizontal: space.lg,
  },
  emptyAvailTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    marginTop: space.md,
  },
  emptyAvailTxt: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginTop: space.sm,
  },
  gateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    marginTop: space.lg,
  },
  gateTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
    marginBottom: space.sm,
  },
  gateBody: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: space.lg,
  },
  gateCta: {
    backgroundColor: colors.orangeFaint,
    borderRadius: radii.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderWidth: 1,
    borderColor: colors.borderOrange,
  },
  gateCtaRed: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  gateCtaTxt: { color: colors.orange, fontWeight: "800", fontSize: 15 },
});
