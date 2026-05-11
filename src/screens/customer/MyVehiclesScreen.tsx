import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { colors, radii, space } from "../../theme/tokens";

export function MyVehiclesScreen() {
  const insets = useSafeAreaInsets();
  const { vehicles, setVehicles } = useApp();

  const setDefault = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === id })),
    );
  };

  const remove = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingHorizontal: space.xl,
        paddingBottom: insets.bottom + space.xl,
      }}
    >
      <Text style={styles.title}>My vehicles</Text>
      <Text style={styles.sub}>
        Saved vehicles pre-select at booking (business plan: default + EV badge).
      </Text>

      {vehicles.map((v) => (
        <View key={v.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.vehicleTitle}>
              {v.make} {v.model}
            </Text>
            {v.isEv ? <Text style={styles.ev}>EV</Text> : null}
            {v.isDefault ? <Text style={styles.default}>Default</Text> : null}
          </View>
          <Text style={styles.reg}>{v.registration}</Text>
          <Text style={styles.year}>{v.year}</Text>
          <View style={styles.actions}>
            {!v.isDefault ? (
              <Pressable onPress={() => setDefault(v.id)}>
                <Text style={styles.link}>Set default</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => Alert.alert("Edit vehicle", "Mock — would open edit form.")}
            >
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => remove(v.id)}>
              <Text style={styles.danger}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <RLButton
        label="Add vehicle (mock)"
        variant="ghost"
        onPress={() =>
          setVehicles((prev) => [
            ...prev,
            {
              id: `v_${Date.now()}`,
              make: "Vauxhall",
              model: "Corsa",
              registration: "LL71 ZZZ",
              year: 2021,
              isEv: false,
              isDefault: false,
            },
          ])
        }
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.white, fontSize: 26, fontWeight: "800" },
  sub: { color: colors.textMuted, marginTop: space.xs, marginBottom: space.lg, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" },
  vehicleTitle: { color: colors.white, fontWeight: "800", fontSize: 18 },
  ev: {
    color: colors.orange,
    fontWeight: "800",
    fontSize: 11,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  default: {
    color: colors.green,
    fontWeight: "800",
    fontSize: 12,
  },
  reg: { color: colors.textMuted, marginTop: space.sm, fontWeight: "600" },
  year: { color: colors.textFaint, marginTop: 4 },
  actions: { flexDirection: "row", gap: space.lg, marginTop: space.md },
  link: { color: colors.orange, fontWeight: "700" },
  danger: { color: colors.red, fontWeight: "700" },
});
