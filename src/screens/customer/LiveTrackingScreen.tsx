import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import { colors, radii, space } from "../../theme/tokens";
import type { RootStackParamList } from "../../navigation/types";

export function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { activeJob, clearActiveJob, completeActiveJob } = useApp();
  const [driverLat, setDriverLat] = useState(activeJob?.driverLat ?? 51.53);
  const [driverLng, setDriverLng] = useState(activeJob?.driverLng ?? -0.09);
  const [eta, setEta] = useState(activeJob?.etaMinutes ?? 6);
  const tick = useRef(0);

  useEffect(() => {
    if (!activeJob) return;
    const id = setInterval(() => {
      tick.current += 1;
      const t = Math.min(1, tick.current / 40);
      setDriverLat(activeJob.driverLat + (activeJob.pickupLat - activeJob.driverLat) * t);
      setDriverLng(activeJob.driverLng + (activeJob.pickupLng - activeJob.driverLng) * t);
      setEta(Math.max(1, Math.round(activeJob.etaMinutes * (1 - t))));
    }, 800);
    return () => clearInterval(id);
  }, [activeJob]);

  if (!activeJob) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>No active job (mock).</Text>
        <RLButton label="Back home" onPress={() => navigation.navigate("MainTabs")} />
      </View>
    );
  }

  const markComplete = () => {
    completeActiveJob({
      id: activeJob.id,
      createdAt: new Date().toISOString(),
      status: "completed",
      operatorName: activeJob.operatorName,
      amountGbp: activeJob.totalGbp,
      pickupLabel: "Shoreditch area (mock)",
      vehicleReg: activeJob.vehicleLabel.split("·").pop()?.trim() ?? "—",
    });
    clearActiveJob();
    navigation.navigate("MainTabs", { screen: "JobHistory" });
  };

  const initialRegion = {
    latitude: (activeJob.driverLat + activeJob.pickupLat) / 2,
    longitude: (activeJob.driverLng + activeJob.pickupLng) / 2,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.flex}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        <Marker
          coordinate={{ latitude: activeJob.pickupLat, longitude: activeJob.pickupLng }}
          title="Pickup"
          pinColor={colors.green}
        />
        <Marker
          coordinate={{ latitude: driverLat, longitude: driverLng }}
          title={activeJob.operatorName}
          description="Recovery truck"
        />
      </MapView>

      <View style={[styles.banner, { top: insets.top + space.sm }]}>
        <Text style={styles.bannerText}>
          {activeJob.status === "en_route" ? "Operator en route" : "Job update"}
        </Text>
        <Text style={styles.bannerEta}>ETA ~{eta} min</Text>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <Text style={styles.driverName}>{activeJob.operatorName}</Text>
        <Text style={styles.rating}>★ {activeJob.operatorRating.toFixed(1)} · RescueLink Pro</Text>
        <Text style={styles.meta}>{activeJob.vehicleLabel}</Text>
        <Text style={styles.issue}>{activeJob.issueLabel}</Text>

        <View style={styles.actions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => Linking.openURL("tel:+447700900321")}
          >
            <Text style={styles.iconBtnText}>Call</Text>
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => Alert.alert("Messages", "In-app chat is mock-only for now.")}
          >
            <Text style={styles.iconBtnText}>Message</Text>
          </Pressable>
        </View>

        <RLButton
          label="Mark job complete (demo)"
          onPress={markComplete}
          style={{ marginTop: space.md }}
        />
        <Pressable
          onPress={() =>
            Alert.alert(
              "Cancel job",
              "Mock flow — cancellation policy would live here.",
            )
          }
        >
          <Text style={styles.cancel}>Cancel job</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  map: { flex: 1 },
  banner: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    padding: space.md,
  },
  bannerText: { color: colors.white, fontWeight: "800" },
  bannerEta: { color: colors.orange, fontWeight: "700", marginTop: 4 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
  },
  driverName: { color: colors.white, fontSize: 22, fontWeight: "800" },
  rating: { color: colors.textMuted, marginTop: 4 },
  meta: { color: colors.text, marginTop: space.md, fontWeight: "600" },
  issue: { color: colors.textMuted, marginTop: space.xs, lineHeight: 20 },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  iconBtn: {
    flex: 1,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: "center",
  },
  iconBtnText: { color: colors.orange, fontWeight: "800" },
  cancel: {
    color: colors.red,
    fontWeight: "700",
    textAlign: "center",
    marginTop: space.lg,
  },
  empty: { flex: 1, backgroundColor: colors.bg, padding: space.xl, justifyContent: "center" },
  emptyText: { color: colors.textMuted, marginBottom: space.lg },
});
