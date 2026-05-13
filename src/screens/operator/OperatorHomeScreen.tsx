import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../../context/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

const MOCK_OFFERS = [
  {
    id: "1",
    payout: "£89.40",
    posted: "Open offer",
    area: "Pickup · Hoxton",
    kit: "Flatbed + winch",
    seconds: 118,
  },
  {
    id: "2",
    payout: "£62.00",
    posted: "Open offer",
    area: "Pickup · Stratford",
    kit: "Winch only",
    seconds: 86,
  },
];

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function OperatorHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { user } = useApp();
  const [available, setAvailable] = useState(false);

  const firstName = user?.firstName?.trim() ?? "Partner";

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingHorizontal: space.lg,
        paddingBottom: insets.bottom + space.xl * 2,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.partnerMark}>RescueLink Partner</Text>
          <Text style={styles.hi}>Hi, {firstName}</Text>
        </View>
        <Pressable hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Operator availability — core of the panel */}
      <Pressable
        onPress={() => setAvailable((v) => !v)}
        style={({ pressed }) => [
          styles.availHero,
          available ? styles.availHeroOn : styles.availHeroOff,
          pressed && { opacity: 0.92 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.availTitle, available && styles.availTitleOn]}>
            {available ? "You're available" : "You're unavailable"}
          </Text>
          <Text style={styles.availSub}>
            {available
              ? "New offers surface to available partners — you choose what you accept."
              : "Tap to go available when you want to see offers — who gets the job is settled by acceptance, not clustering in the same areas."}
          </Text>
        </View>
        <View style={[styles.availKnobOuter, available && styles.availKnobOuterOn]}>
          <View style={[styles.availKnob, available && styles.availKnobOn]} />
        </View>
      </Pressable>

      <View style={styles.statsRow}>
        <StatChip label="Today est." value={available ? "£0.00" : "—"} />
        <StatChip label="Completed" value="0" />
        <StatChip label="Session" value={available ? "0h 12m*" : "—"} />
      </View>
      <Text style={styles.statFoot}>* Demo timer — backend will track shifts.</Text>

      <View style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <Ionicons name="location" size={18} color={colors.orange} />
          <Text style={styles.mapTitle}>Map</Text>
        </View>
        <Text style={styles.mapSub}>
          Work is not assigned by who is geographically closest. Operators spread out naturally
          because jobs go to whoever accepts them — not everyone chasing the same patch.
        </Text>
        <View style={styles.mapBlock}>
          <Ionicons name="map-outline" size={42} color={colors.textFaint} />
          <Text style={styles.mapHint}>
            Nav and scenes appear here once you accept a job and dispatch connects.
          </Text>
        </View>
      </View>

      {available ? (
        <>
          <Text style={styles.sectionHdr}>Incoming requests</Text>
          <Text style={styles.sectionMuted}>
            Offers are not ranked by distance — review payout, pickup, and kit, then accept when it
            works for you.
          </Text>
          {MOCK_OFFERS.map((o) => (
            <View key={o.id} style={styles.offerCard}>
              <View style={styles.offerTop}>
                <Text style={styles.offerPay}>{o.payout}</Text>
                <Text style={styles.offerMeta}>{o.posted}</Text>
              </View>
              <Text style={styles.offerLine}>{o.area}</Text>
              <Text style={styles.offerKit}>{o.kit}</Text>
              <View style={styles.offerTimer}>
                <Ionicons name="timer-outline" size={16} color={colors.orange} />
                <Text style={styles.offerTimerTxt}>
                  {Math.floor(o.seconds / 60)}:{String(o.seconds % 60).padStart(2, "0")} to respond (mock)
                </Text>
              </View>
              <View style={styles.offerBtns}>
                <Pressable
                  style={styles.btnDecline}
                  onPress={() => {}}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnDeclineTxt}>Decline</Text>
                </Pressable>
                <Pressable
                  style={styles.btnAccept}
                  onPress={() => navigation.navigate("OperatorLiveJob")}
                  accessibilityRole="button"
                >
                  <Text style={styles.btnAcceptTxt}>Accept</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyAvail}>
          <Ionicons name="walk-outline" size={36} color={colors.textFaint} />
          <Text style={styles.emptyAvailTitle}>Nothing to show yet</Text>
          <Text style={styles.emptyAvailTxt}>
            Go available to see recovery offers — taking a job depends on accepting it, not chasing the
            nearest postcode.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: space.lg,
  },
  partnerMark: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  hi: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  availHero: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.lg,
    borderRadius: radii.lg,
    marginBottom: space.md,
    borderWidth: 1,
    minHeight: 100,
    gap: space.md,
  },
  availHeroOff: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  availHeroOn: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  availTitle: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: "800",
  },
  availTitleOn: { color: colors.green },
  availSub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: space.xs,
  },
  availKnobOuter: {
    width: 54,
    height: 30,
    borderRadius: 16,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 3,
    alignSelf: "center",
  },
  availKnobOuterOn: {
    backgroundColor: "rgba(34,197,94,0.25)",
    borderColor: colors.green,
    alignItems: "flex-end",
  },
  availKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textFaint,
  },
  availKnobOn: { backgroundColor: colors.green },
  statsRow: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.sm,
  },
  statChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { color: colors.textFaint, fontSize: 11, fontWeight: "600" },
  statValue: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  statFoot: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.lg,
  },
  mapHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  mapTitle: { color: colors.white, fontWeight: "800", fontSize: 16 },
  mapSub: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: space.sm },
  mapBlock: {
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  mapHint: { color: colors.textFaint, fontSize: 12, textAlign: "center", paddingHorizontal: space.lg },
  sectionHdr: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: space.xs,
  },
  sectionMuted: { color: colors.textMuted, fontSize: 13, marginBottom: space.md, lineHeight: 18 },
  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
  },
  offerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  offerPay: { color: colors.orange, fontSize: 22, fontWeight: "900" },
  offerMeta: { color: colors.textMuted, fontWeight: "700" },
  offerLine: { color: colors.white, fontWeight: "700", marginTop: space.sm, fontSize: 16 },
  offerKit: { color: colors.textMuted, marginTop: 4, fontSize: 14 },
  offerTimer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md },
  offerTimerTxt: { color: colors.orange, fontWeight: "700", fontSize: 13 },
  offerBtns: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: space.lg,
  },
  btnDecline: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  btnDeclineTxt: { color: colors.textMuted, fontWeight: "800" },
  btnAccept: {
    flex: 1,
    alignItems: "center",
    paddingVertical: space.md,
    borderRadius: radii.md,
    backgroundColor: colors.green,
    borderWidth: 1,
    borderColor: "transparent",
  },
  btnAcceptTxt: { color: colors.white, fontWeight: "800" },
  emptyAvail: {
    alignItems: "center",
    paddingVertical: space.xl + space.lg,
    paddingHorizontal: space.lg,
  },
  emptyAvailTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 18,
    marginTop: space.md,
  },
  emptyAvailTxt: {
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginTop: space.sm,
  },
});
