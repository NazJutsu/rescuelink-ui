import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DevPageRef } from "./pageNumbers";
import { colors, radii, space } from "../theme/tokens";

type Props = DevPageRef & {
  /** Optional suffix, e.g. onboarding step */
  suffix?: string;
};

export function DevPageBadge({ id, label, suffix }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { top: insets.top + space.xs }]}
      pointerEvents="none"
    >
      <Text style={styles.id}>{id}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
        {suffix ? ` · ${suffix}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: space.sm,
    zIndex: 9999,
    maxWidth: 160,
    alignItems: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm,
    backgroundColor: "rgba(17, 17, 24, 0.88)",
    borderWidth: 1,
    borderColor: colors.borderOrange,
  },
  id: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
    textAlign: "right",
  },
});
