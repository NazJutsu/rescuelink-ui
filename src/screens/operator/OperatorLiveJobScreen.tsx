import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton } from "../../components/ui";
import type { CombinedStackParamList } from "../../navigation/types";
import { colors, space } from "../../theme/tokens";

export function OperatorLiveJobScreen() {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<CombinedStackParamList>>();

  return (
    <View style={[styles.flex, { paddingTop: insets.top, paddingHorizontal: space.xl }]}>
      <Text style={styles.title}>Active recovery (stub)</Text>
      <Text style={styles.body}>
        Real-time telemetry, SLA timers, customer chat, POD capture, AML holds,
        route replays, and payout release chain to backend websocket + ledger
        services later.
      </Text>
      <RLButton label="Close" variant="ghost" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: space.md,
    marginTop: space.lg,
  },
  body: { color: colors.textMuted, lineHeight: 22, marginBottom: space.xl },
});
