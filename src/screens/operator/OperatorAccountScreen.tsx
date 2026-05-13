import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

export function OperatorAccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { user, logout, operatorProfile } = useApp();

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
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Driver · Approved (mock)</Text>
      </View>
      <Text style={styles.meta}>
        Verification:{" "}
        {operatorProfile?.verificationStatus ?? "unknown"}
      </Text>

      <Pressable style={styles.row} onPress={() => {}}>
        <Text style={styles.rowTitle}>Help centre (mock)</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => {}}>
        <Text style={styles.rowTitle}>Vehicle & equipment</Text>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => {}}>
        <Text style={styles.rowTitle}>Bank & payouts</Text>
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

      <RLButton label="Sign out" variant="ghost" onPress={logout} />
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
  badge: {
    alignSelf: "flex-start",
    marginTop: space.sm,
    backgroundColor: colors.orangeFaint,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderOrange,
  },
  badgeText: { color: colors.orange, fontWeight: "700", fontSize: 12 },
  meta: {
    color: colors.textMuted,
    marginTop: space.md,
    marginBottom: space.xl,
  },
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
