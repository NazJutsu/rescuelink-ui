import React from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../context/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import type { PastJob } from "../../mock/types";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function JobHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { jobs } = useApp();

  const renderItem = ({ item }: { item: PastJob }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <Text
          style={[
            styles.status,
            item.status === "completed" && { color: colors.green },
            item.status === "cancelled" && { color: colors.red },
          ]}
        >
          {item.status.replace("_", " ")}
        </Text>
      </View>
      <Text style={styles.operator}>{item.operatorName}</Text>
      <Text style={styles.pickup}>{item.pickupLabel}</Text>
      <Text style={styles.amount}>
        {item.amountGbp > 0 ? `£${item.amountGbp.toFixed(2)}` : "—"}
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => Alert.alert("Receipt", `Receipt for job ${item.id} (mock PDF).`)}
        >
          <Text style={styles.link}>Receipt</Text>
        </Pressable>
        <Pressable onPress={() => Alert.alert("Re-book", "Would pre-fill a new booking (mock).")}>
          <Text style={styles.link}>Re-book</Text>
        </Pressable>
        <Pressable onPress={() => Alert.alert("Dispute", "Would open support flow (mock).")}>
          <Text style={styles.linkDanger}>Dispute</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.flex, { paddingTop: insets.top + space.md }]}>
      <Text style={styles.title}>Job history</Text>
      <Text style={styles.sub}>Past recoveries and payments (mock data).</Text>
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No jobs yet — complete a booking from Home.</Text>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.white,
    fontSize: 26,
    fontWeight: "800",
    paddingHorizontal: space.xl,
  },
  sub: {
    color: colors.textMuted,
    paddingHorizontal: space.xl,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: space.sm },
  date: { color: colors.textMuted, fontSize: 13 },
  status: { color: colors.orange, fontWeight: "800", textTransform: "capitalize" },
  operator: { color: colors.white, fontWeight: "700", fontSize: 16 },
  pickup: { color: colors.textMuted, marginTop: 4 },
  amount: { color: colors.orange, fontWeight: "800", fontSize: 18, marginTop: space.sm },
  row: { flexDirection: "row", gap: space.lg, marginTop: space.md },
  link: { color: colors.orange, fontWeight: "700" },
  linkDanger: { color: colors.red, fontWeight: "700" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: space.xl },
});
