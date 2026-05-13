import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

export function OperatorPendingApprovalScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { operatorProfile, devApproveOperator, devRejectOperator, user } = useApp();

  const submitted = operatorProfile?.submittedAt;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.xl,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom + space.xl,
      }}
    >
      <Text style={styles.title}>Verification in progress</Text>
      <View style={styles.operatorShellCard}>
        <Text style={styles.shellTitle}>You are in the RescueLink driver area</Text>
        <Text style={styles.shellBody}>
          The passenger map and booking tabs stay hidden for operators. After compliance approves
          you, you get an operator-style Partner panel: Home (go available & see offers), Jobs, Earnings,
          and More (account & legal).
        </Text>
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Simulator · preview driver UI</Text>
        <Text style={styles.previewBody}>
          Tap Approve below to unlock the driver console in this mock build. In production,
          RescueLink support would flip your status instead.
        </Text>
      </View>

      <Text style={styles.sub}>
        Thanks{user?.firstName ? `, ${user.firstName}` : ""}. Our compliance desk
        will review licences, insurer certificates, GVW classifications, payout
        formatting, O-licence evidence (when applicable), and driving categories.
      </Text>
      {submitted ? (
        <Text style={styles.meta}>Submitted · {submitted.slice(0, 19)}</Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What happens next?</Text>
        <Text style={styles.cardBody}>
          Backend phase attaches virus scanning on PDFs, IDV tooling, AML
          screening posture, escrow/payout connectors, tachograph conformance
          metadata, HMRC reporting hooks, SLA timers, pooled-liability language, and audit trails.
          This screen is informational only until those services ship.
        </Text>
      </View>

      <RLButton
        label="Approve me (dev only)"
        variant="ghost"
        onPress={() => {
          devApproveOperator();
        }}
      />

      <View style={{ height: space.sm }} />

      <RLButton
        label="Reject application (dev only)"
        variant="danger"
        onPress={() => {
          devRejectOperator(
            "Policy expiry on recovery certificate precedes MOT date on GVW worksheet — upload matching schedule.",
          );
        }}
      />

      <Pressable onPress={() => navigation.navigate("Legal", { kind: "operator_contract" })}>
        <Text style={styles.link}>Operator framework draft</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: space.sm,
  },
  sub: { color: colors.textMuted, lineHeight: 22, marginBottom: space.md },
  operatorShellCard: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: radii.lg,
    padding: space.md,
    marginBottom: space.md,
  },
  shellTitle: {
    color: colors.green,
    fontWeight: "800",
    marginBottom: space.xs,
    fontSize: 15,
  },
  shellBody: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
  previewCard: {
    backgroundColor: colors.surface2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    padding: space.md,
    marginBottom: space.xl,
  },
  previewTitle: { color: colors.orange, fontWeight: "800", marginBottom: space.xs },
  previewBody: { color: colors.textMuted, lineHeight: 20, fontSize: 14 },
  meta: {
    color: colors.textFaint,
    fontSize: 13,
    marginBottom: space.lg,
    fontVariant: ["tabular-nums"],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.xl,
  },
  cardTitle: { color: colors.white, fontWeight: "800", marginBottom: space.sm },
  cardBody: { color: colors.textMuted, lineHeight: 21 },
  link: {
    marginTop: space.lg,
    color: colors.orange,
    fontWeight: "700",
  },
});
