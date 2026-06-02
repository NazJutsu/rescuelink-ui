import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, space } from "../theme/tokens";
import type { UserRole } from "../types";

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  operator: "Driver",
};

type Props = {
  role: UserRole;
  onLeave?: () => void;
};

export function RoleBanner({ role, onLeave }: Props) {
  const emoji = role === "customer" ? "🚗" : "🚛";
  const label = ROLE_LABELS[role];

  return (
    <View style={styles.banner}>
      <View style={styles.top}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>Registering as a {label}</Text>
        <View style={styles.dot} />
      </View>
      {onLeave ? (
        <Pressable onPress={onLeave} hitSlop={8}>
          <Text style={styles.link}>
            Not a {label.toLowerCase()}?{" "}
            <Text style={styles.linkBold}>Switch role</Text>
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 4,
    marginBottom: space.lg,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: { fontSize: 16 },
  title: {
    flex: 1,
    color: colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.orange,
  },
  link: { color: colors.textMuted, fontSize: 13 },
  linkBold: { color: colors.orange, fontWeight: "700" },
});
