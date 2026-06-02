import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { useApp } from "../../state/AppContext";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

export function OperatorRejectedScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();
  const { operatorProfile, beginOperatorResubmit } = useApp();

  const reason =
    operatorProfile?.rejectionReason ??
    "Your application needs updates — see compliance notes from RescueLink (backend).";

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom + space.xl,
      }}
    >
      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
        <Text style={styles.backTxt}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Application not approved</Text>
      <Text style={styles.sub}>
        You can revise your licences, insurer PDFs, O-licence evidence, and payout
        details, then submit again.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Compliance note</Text>
        <Text style={styles.reason}>{reason}</Text>
      </View>

      <RLButton
        label="Edit profile & resubmit"
        onPress={() => beginOperatorResubmit()}
      />

      <View style={{ height: space.md }} />

      <Pressable onPress={() => navigation.navigate("Legal", { kind: "operator_contract" })}>
        <Text style={styles.link}>Operator framework (draft)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: space.md,
  },
  backTxt: { color: colors.text, fontWeight: "700", fontSize: 16 },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    marginBottom: space.sm,
  },
  sub: { color: colors.textMuted, lineHeight: 22, marginBottom: space.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.xl,
  },
  cardTitle: { color: colors.orange, fontWeight: "800", marginBottom: space.sm },
  reason: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
  link: {
    marginTop: space.sm,
    color: colors.orange,
    fontWeight: "700",
    textAlign: "center",
  },
});
