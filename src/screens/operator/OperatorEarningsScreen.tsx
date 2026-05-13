import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
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
