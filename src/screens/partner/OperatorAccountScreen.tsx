import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { useApp } from "../../state/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import type { VerificationStatus } from "../../types";
import { colors, radii, space } from "../../theme/tokens";

function VerificationCard({ status, submittedAt, rejectionReason }: {
  status: VerificationStatus;
  submittedAt?: string;
  rejectionReason?: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();

  if (status === "approved") {
    return (
      <View style={[styles.verCard, styles.verCardApproved]}>
        <View style={styles.verRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.green} />
          <Text style={[styles.verTitle, { color: colors.green }]}>Verified driver</Text>
        </View>
        <Text style={styles.verBody}>
          Your compliance documents have been approved. You can accept recovery jobs.
        </Text>
      </View>
    );
  }

  if (status === "pending_review") {
    return (
      <Pressable
        style={[styles.verCard, styles.verCardPending]}
        onPress={() => navigation.navigate("OperatorPending")}
      >
        <View style={styles.verRow}>
          <Ionicons name="time-outline" size={20} color="#60a5fa" />
          <Text style={[styles.verTitle, { color: "#60a5fa" }]}>Awaiting review</Text>
        </View>
        <Text style={styles.verBody}>
          Your application is with our compliance team.
          {submittedAt ? `\nSubmitted ${submittedAt.slice(0, 10)}` : ""}
        </Text>
        <Text style={styles.verCta}>View details ›</Text>
      </Pressable>
    );
  }

  if (status === "rejected") {
    return (
      <Pressable
        style={[styles.verCard, styles.verCardRejected]}
        onPress={() => navigation.navigate("OperatorRejected")}
      >
        <View style={styles.verRow}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.red} />
          <Text style={[styles.verTitle, { color: colors.red }]}>Action needed</Text>
        </View>
        <Text style={styles.verBody} numberOfLines={2}>
          {rejectionReason ?? "Your application needs updates — tap to see details."}
        </Text>
        <Text style={styles.verCta}>Review &amp; resubmit ›</Text>
      </Pressable>
    );
  }

  // incomplete_docs
  return (
    <Pressable
      style={[styles.verCard, styles.verCardIncomplete]}
      onPress={() => navigation.navigate("OperatorOnboarding")}
    >
      <View style={styles.verRow}>
        <Ionicons name="document-text-outline" size={20} color={colors.orange} />
        <Text style={[styles.verTitle, { color: colors.orange }]}>Complete your profile</Text>
      </View>
      <Text style={styles.verBody}>
        Upload your documents and complete compliance to start accepting recovery jobs.
      </Text>
      <Text style={styles.verCta}>Continue onboarding ›</Text>
    </Pressable>
  );
}

export function OperatorAccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { user, logout, operatorProfile } = useApp();

  const status = operatorProfile?.verificationStatus ?? "incomplete_docs";

  const statusLabel =
    status === "approved"
      ? "Verified driver"
      : status === "pending_review"
        ? "Under review"
        : status === "rejected"
          ? "Action needed"
          : "Onboarding incomplete";

  const statusColor =
    status === "approved"
      ? colors.green
      : status === "pending_review"
        ? "#60a5fa"
        : status === "rejected"
          ? colors.red
          : colors.orange;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom + space.xl,
      }}
    >
      <View style={styles.shellBadge}>
        <Text style={styles.shellBadgeText}>PARTNER · More</Text>
      </View>

      <Text style={styles.name}>
        {user?.firstName} {user?.lastName}
      </Text>

      <View style={[styles.statusPill, { borderColor: statusColor }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      <VerificationCard
        status={status}
        submittedAt={operatorProfile?.submittedAt}
        rejectionReason={operatorProfile?.rejectionReason}
      />

      <Pressable style={styles.row} onPress={() => {}}>
        <Text style={styles.rowTitle}>Help centre</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => {}}>
        <Text style={styles.rowTitle}>Vehicle &amp; equipment</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => {}}>
        <Text style={styles.rowTitle}>Bank &amp; payouts</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("Legal", { kind: "operator_contract" })}
      >
        <Text style={styles.rowTitle}>Partner agreement</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("Legal", { kind: "privacy" })}
      >
        <Text style={styles.rowTitle}>Privacy</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      <RLButton label="Sign out" variant="ghost" onPress={logout} style={{ marginTop: space.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  shellBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.orangeFaint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    marginBottom: space.md,
  },
  shellBadgeText: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  name: { color: colors.white, fontSize: 24, fontWeight: "800" },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.sm,
    marginBottom: space.lg,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontWeight: "700", fontSize: 12 },
  verCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.xl,
    gap: space.xs,
  },
  verCardApproved: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  verCardPending: {
    backgroundColor: "rgba(96,165,250,0.08)",
    borderColor: "rgba(96,165,250,0.35)",
  },
  verCardRejected: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  verCardIncomplete: {
    backgroundColor: colors.orangeFaint,
    borderColor: colors.borderOrange,
  },
  verRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verTitle: { fontWeight: "800", fontSize: 15 },
  verBody: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
  verCta: { color: colors.orange, fontWeight: "700", fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.white, fontWeight: "700" },
  chev: { color: colors.textFaint, fontSize: 20 },
});
