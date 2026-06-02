import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, space } from "../../theme/tokens";

type Props = NativeStackScreenProps<CombinedStackParamList, "Legal">;

const BODY: Record<
  Props["route"]["params"]["kind"],
  { title: string; paragraphs: string[] }
> = {
  terms: {
    title: "Terms of Service (placeholder)",
    paragraphs: [
      "This RescueLink MVP shows placeholder legal text only. Replace with solicitor-reviewed terms before inviting real users.",
      "The service is offered “as-is” during development. Liability limits, arbitration, jurisdiction, subscription rules, cancellation, and indemnities belong in production terms.",
      "Mock payments and payouts do not constitute a contract.",
    ],
  },
  privacy: {
    title: "Privacy Notice (placeholder)",
    paragraphs: [
      "Explain what personal data you collect (profile, licences, insurer details, payouts, telemetry, precise location history), lawful bases under UK GDPR/EU GDPR, processors, retention, DSR/export paths, DPIA summaries, breach handling, ICO contact, and minors policy.",
      "Operator documents may include special-category-adjacent data—treat storage, access control, encryption, retention, deletion, subprocessors, transfers, DPIA triggers, SAR handling, lawful basis articulation carefully with counsel.",
      "This build stores mock data locally via AsyncStorage for demo continuity only.",
    ],
  },
  operator_contract: {
    title: "Operator / contractor framework (placeholder)",
    paragraphs: [
      "Commission structure, SLA, subcontracting, indemnity, insurance warranties, O-licence attestations, pooled-liability exclusions, payout holds/chargebacks, mediation, publicity, and GDPR controller/processor roles need bespoke drafting.",
      "Operator documents may include sensitive categories—align storage, encryption, retention, subprocessors, and transfers with UK GDPR / EU GDPR counsel guidance.",
      "IDV, PEP/sanctions screening, electronic signature, AML/CFT, and HMRC rules (CIS, VAT) depend on rollout territory—finalize with your solicitor and tax advisors.",
    ],
  },
};

export function LegalScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { kind } = route.params;
  const doc = BODY[kind];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={2}>
          {doc.title}
        </Text>
        <View style={{ width: 48 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingBottom: insets.bottom + space.xl,
        }}
      >
        {doc.paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>
            {p}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { color: colors.orange, fontWeight: "700" },
  title: {
    flex: 1,
    color: colors.white,
    fontWeight: "800",
    fontSize: 15,
    textAlign: "center",
  },
  scroll: { flex: 1 },
  paragraph: {
    color: colors.textMuted,
    lineHeight: 22,
    marginTop: space.lg,
    fontSize: 15,
  },
});
