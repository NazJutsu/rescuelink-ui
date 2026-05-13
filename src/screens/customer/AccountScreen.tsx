import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { user, logout } = useApp();

  if (!user) return null;

  const rows = [
    { label: "Personal details", hint: `${user.firstName} ${user.lastName}` },
    { label: "Phone number", hint: user.phone },
    { label: "Password & security", hint: "Mock — change password" },
    { label: "Notification preferences", hint: "Push, SMS, email" },
    { label: "Payment methods", hint: "Apple Pay, cards (mock)" },
    { label: "Default service area", hint: "Greater London (mock)" },
  ] as const;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom + space.xl,
      }}
    >
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.firstName[0]}
            {user.lastName[0]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {user.role === "operator" ? "Driver" : "Customer"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.section}>Legal</Text>
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("Legal", { kind: "terms" })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Terms</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("Legal", { kind: "privacy" })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Privacy notice</Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>

      <Text style={[styles.section, { marginTop: space.sm }]}>Account</Text>
      {rows.map((r) => (
        <Pressable
          key={r.label}
          style={styles.row}
          onPress={() => Alert.alert(r.label, "Settings screen is mock-only in MVP.")}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{r.label}</Text>
            <Text style={styles.rowHint}>{r.hint}</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>
      ))}

      <RLButton
        label="Sign out"
        variant="ghost"
        onPress={() => logout()}
        style={{ marginTop: space.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    marginBottom: space.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.orangeFaint,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.orange, fontWeight: "900", fontSize: 18 },
  name: { color: colors.white, fontSize: 22, fontWeight: "800" },
  badge: {
    alignSelf: "flex-start",
    marginTop: space.sm,
    backgroundColor: colors.surface2,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { color: colors.textMuted, fontWeight: "700", fontSize: 12 },
  section: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowTitle: { color: colors.white, fontWeight: "700" },
  rowHint: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  chev: { color: colors.textFaint, fontSize: 22, marginLeft: space.sm },
});
