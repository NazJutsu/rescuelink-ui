import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { colors, radii, space } from "../../theme/tokens";
import { DevPageBadge } from "../../dev/DevPageBadge";
import { DEV_PAGES } from "../../dev/pageNumbers";
import type { CombinedStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<CombinedStackParamList, "Landing">;

const PILLS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "time-outline", label: "Available 24/7" },
  { icon: "navigate-outline", label: "Track your driver" },
  { icon: "cash-outline", label: "No hidden fees" },
];

export function LandingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>

      {/* ── Hero illustration ── */}
      <View style={styles.heroSection}>
        <View style={styles.glowOuter} />
        <View style={styles.glowInner} />
        <Text style={styles.truckEmoji}>🚛</Text>
        {/* Live status dot */}
        <View style={styles.liveDot} />
      </View>

      {/* ── Headline ── */}
      <Text style={styles.headline}>
        Roadside help,{"\n"}
        <Text style={styles.headlineAccent}>in minutes</Text>
      </Text>

      <Text style={styles.sub}>
        Connect with a local recovery driver.{"\n"}
        Real-time tracking. No waiting on hold.
      </Text>

      {/* ── Feature pills ── */}
      <View style={styles.pillsRow}>
        {PILLS.map((p) => (
          <View key={p.label} style={styles.pill}>
            <Ionicons name={p.icon} size={13} color={colors.textMuted} />
            <Text style={styles.pillText}>{p.label}</Text>
          </View>
        ))}
      </View>

      {/* ── CTAs ── */}
      <View style={styles.ctaSection}>
        <RLButton
          label="Create an account  →"
          onPress={() => navigation.navigate("Register")}
          style={styles.createBtn}
        />

        {/* "already registered" divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>already registered</Text>
          <View style={styles.dividerLine} />
        </View>

        <RLButton
          label="→  Sign in"
          variant="ghost"
          onPress={() => navigation.navigate("Login")}
        />
      </View>

      {/* ── Legal ── */}
      <Text style={styles.legal}>
        By continuing you agree to our{" "}
        <Text
          style={styles.legalLink}
          onPress={() => navigation.navigate("Legal", { kind: "terms" })}
        >
          Terms
        </Text>
        {" "}and{" "}
        <Text
          style={styles.legalLink}
          onPress={() => navigation.navigate("Legal", { kind: "privacy" })}
        >
          Privacy Policy
        </Text>
      </Text>

      {/* ── Driver recruitment footer ── */}
      <Pressable
        onPress={() => navigation.navigate("Register")}
        style={styles.driverRow}
        hitSlop={8}
      >
        <Text style={styles.driverText}>
          Are you a recovery driver?{" "}
          <Text style={styles.driverLink}>Join as a driver →</Text>
        </Text>
      </Pressable>

      <DevPageBadge {...DEV_PAGES.landing} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    gap: space.lg,
  },

  // ── Hero ──
  heroSection: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  glowOuter: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(249,115,22,0.08)",
  },
  glowInner: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(249,115,22,0.14)",
  },
  truckEmoji: {
    fontSize: 64,
  },
  liveDot: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.bg,
  },

  // ── Copy ──
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: colors.white,
    textAlign: "center",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  headlineAccent: {
    color: colors.orange,
  },
  sub: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  // ── Pills ──
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── CTAs ──
  ctaSection: {
    width: "100%",
    gap: space.sm,
  },
  createBtn: {
    paddingVertical: space.md + 2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "500",
  },

  // ── Legal ──
  legal: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  legalLink: {
    color: colors.textMuted,
    textDecorationLine: "underline",
  },

  // ── Driver footer ──
  driverRow: {
    paddingVertical: space.xs,
  },
  driverText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  driverLink: {
    color: colors.orange,
    fontWeight: "700",
  },
});
