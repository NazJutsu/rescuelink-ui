import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { CombinedStackParamList } from "../../navigation/types";
import { useApp } from "../../state/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import { isFirebaseConfigured } from "../../firebase/config";
import {
  earningsByDayThisWeek,
  sumCompletedToday,
} from "../../firebase/jobMappers";
import { subscribeToDriverCompletedJobs, type JobDoc } from "../../firebase/jobService";

const MOCK_WEEK = [
  { day: "Mon", amount: 126 },
  { day: "Tue", amount: 0 },
  { day: "Wed", amount: 74.2 },
  { day: "Thu", amount: 0 },
  { day: "Fri", amount: 48.5 },
  { day: "Sat", amount: 92 },
  { day: "Sun", amount: 0 },
];

export function OperatorEarningsScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { user, operatorProfile } = useApp();
  const isApproved = operatorProfile?.verificationStatus === "approved";
  const useLiveData = isFirebaseConfigured() && Boolean(user);

  const [completedJobs, setCompletedJobs] = useState<JobDoc[]>([]);

  useEffect(() => {
    if (!useLiveData || !user || !isApproved) return;
    return subscribeToDriverCompletedJobs(user.id, setCompletedJobs);
  }, [useLiveData, user, isApproved]);

  const todayTotal = useMemo(
    () => (useLiveData ? sumCompletedToday(completedJobs) : 0),
    [useLiveData, completedJobs],
  );

  const weekRows = useMemo(() => {
    if (!useLiveData) return MOCK_WEEK;
    return earningsByDayThisWeek(completedJobs);
  }, [useLiveData, completedJobs]);

  const weekTotal = useMemo(
    () => weekRows.reduce((sum, row) => sum + row.amount, 0),
    [weekRows],
  );

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
        {useLiveData
          ? "Live totals from completed recoveries on your account."
          : "High-level payout view for recoveries — live totals once billing connects to this tab."}
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
            <Text style={styles.heroLabel}>{useLiveData ? "Today" : "Today (mock)"}</Text>
            <Text style={styles.heroAmt}>£{todayTotal.toFixed(2)}</Text>
            <View style={styles.heroRow}>
              <Ionicons name="trending-up" size={18} color={colors.green} />
              <Text style={styles.heroHint}>
                {useLiveData
                  ? `£${weekTotal.toFixed(2)} completed this week.`
                  : "Live totals connect when billing is wired."}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>This week</Text>
          <View style={styles.table}>
            {weekRows.map((r) => (
              <View key={r.day} style={styles.tableRow}>
                <Text style={styles.tableDay}>{r.day}</Text>
                <Text style={styles.tableAmt}>£{r.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.payoutCard}>
            <Ionicons name="wallet-outline" size={22} color={colors.orange} />
            <View style={{ flex: 1, marginLeft: space.md }}>
              <Text style={styles.payoutTitle}>Next payout</Text>
              <Text style={styles.payoutSub}>
                {useLiveData
                  ? "Weekly payout after platform fees — billing integration coming soon."
                  : "Mock · usually weekly after platform fees"}
              </Text>
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
