import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { CombinedStackParamList } from "../../navigation/types";
import { useApp } from "../../state/AppContext";
import { colors, radii, space } from "../../theme/tokens";

const MOCK_HISTORY = [
  {
    id: "h1",
    when: "Yesterday · 18:22",
    title: "Winch · Canary Wharf",
    payout: "£74.20",
    status: "Paid (mock)",
  },
  {
    id: "h2",
    when: "Mon · 09:05",
    title: "Flatbed · M25 slip",
    payout: "£126.00",
    status: "Paid (mock)",
  },
];

export function OperatorJobsScreen() {
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
      <Text style={styles.title}>Jobs</Text>
      <Text style={styles.sub}>
        Active assignments and completed recoveries in one place.
      </Text>

      {!isApproved ? (
        <View style={styles.gateCard}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={colors.textFaint}
            style={{ marginBottom: space.sm }}
          />
          <Text style={styles.gateTitle}>Jobs unlock after verification</Text>
          <Text style={styles.gateTxt}>
            Complete your compliance profile and get approved to start accepting recovery jobs.
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
          <Text style={styles.section}>Active</Text>
          <View style={styles.emptyCard}>
            <Ionicons name="car-outline" size={32} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No active job</Text>
            <Text style={styles.emptyTxt}>
              Accept from Home when you're available, or open a staged job below (demo).
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("OperatorLiveJob")}
            >
              <Text style={styles.primaryBtnTxt}>Open live job (mock)</Text>
            </Pressable>
          </View>

          <Text style={styles.section}>Recent</Text>
          {MOCK_HISTORY.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowPay}>{row.payout}</Text>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowMeta}>
                  {row.when} · {row.status}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </View>
          ))}
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
  section: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: space.sm,
    marginTop: space.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.white,
    fontWeight: "800",
    marginTop: space.sm,
    fontSize: 16,
  },
  emptyTxt: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  primaryBtn: {
    backgroundColor: colors.orange,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.orangeDark,
  },
  primaryBtnTxt: { color: colors.white, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.sm,
    gap: space.sm,
  },
  rowPay: { color: colors.orange, fontWeight: "900", fontSize: 18 },
  rowTitle: { color: colors.white, fontWeight: "700", marginTop: 4 },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
