import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { CombinedStackParamList } from "../../navigation/types";
import { useApp } from "../../state/AppContext";
import { colors, radii, space } from "../../theme/tokens";

const MOCK_WEEK = [
  { day: "Mon", amount: "£126.00" },
  { day: "Tue", amount: "£0.00" },
  { day: "Wed", amount: "£74.20" },
  { day: "Thu", amount: "£0.00" },
  { day: "Fri", amount: "£48.50" },
  { day: "Sat", amount: "£92.00" },
  { day: "Sun", amount: "£0.00" },
];

export function OperatorEarningsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { operatorProfile } = useApp();
  const isApproved = operatorProfile?.verificationStatus === "approved";

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingHorizontal: space.lg,
        paddingBottom: insets.bottom + space.xl * 2,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Earnings</Text>
      <Text style={styles.sub}>
        High-level payout view for recoveries — live totals once billing connects to this tab.
      </Text>

      {!isApproved ? (
        <View style={styles.gateCard}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={colors.textFaint}
            style={{ marginBottom: space.sm }}
          />
          <Text style={styles.gateTitle}>Earnings unlock after verification</Text>
          <Text style={styles.gateTxt}>
            Once your compliance profile is approved, your payout history and projections appear here.
          </Text>
          <Pressable
            style={styles.gateCta}
            onPress={() => navigation.navigate("OperatorOnboarding")}
          >
            <Text style={styles.gateCtaTxt}>Complete profile</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Today (mock)</Text>
            <Text style={styles.heroAmt}>£0.00</Text>
            <View style={styles.heroRow}>
              <Ionicons name="trending-up" size={18} color={colors.green} />
              <Text style={styles.heroHint}>Live totals connect when billing is wired.</Text>
            </View>
          </View>

          <Text style={styles.section}>This week</Text>
          <View style={styles.table}>
            {MOCK_WEEK.map((r) => (
              <View key={r.day} style={styles.tableRow}>
                <Text style={styles.tableDay}>{r.day}</Text>
                <Text style={styles.tableAmt}>{r.amount}</Text>
              </View>
            ))}
          </View>

          <View style={styles.payoutCard}>
            <Ionicons name="wallet-outline" size={22} color={colors.orange} />
            <View style={{ flex: 1, marginLeft: space.md }}>
              <Text style={styles.payoutTitle}>Next payout</Text>
              <Text style={styles.payoutSub}>Mock · usually weekly after platform fees</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
  },
  sub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  gateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: "center",
    marginTop: space.sm,
  },
  gateTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
    marginBottom: space.sm,
  },
  gateTxt: {
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
  gateCtaTxt: { color: colors.orange, fontWeight: "800", fontSize: 15 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.lg,
  },
  heroLabel: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  heroAmt: {
    color: colors.white,
    fontSize: 40,
    fontWeight: "900",
    marginTop: space.sm,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.md,
  },
  heroHint: { color: colors.textMuted, fontSize: 13, flex: 1 },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: space.sm,
  },
  table: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: space.lg,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableDay: { color: colors.textMuted, fontWeight: "700" },
  tableAmt: { color: colors.white, fontWeight: "800" },
  payoutCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.orangeFaint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    padding: space.md,
  },
  payoutTitle: { color: colors.white, fontWeight: "800" },
  payoutSub: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
});
