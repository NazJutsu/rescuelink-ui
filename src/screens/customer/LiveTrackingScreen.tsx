import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RLButton } from "../../components/ui";
import { buildMockActiveJob, useApp } from "../../context/AppContext";
import type { RootStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

const MOCK_TICKETS = 40;
const MOCK_TICK_MS = 800;

/** Linear interpolation helper for demo driver path (straight-line approximation). */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    activeJob,
    beginActiveJob,
    clearActiveJob,
    completeActiveJob,
  } = useApp();
  const mapRef = useRef<MapView>(null);
  const [driverLat, setDriverLat] = useState(activeJob?.driverLat ?? 51.53);
  const [driverLng, setDriverLng] = useState(activeJob?.driverLng ?? -0.09);
  const [eta, setEta] = useState(activeJob?.etaMinutes ?? 6);
  const [progressT, setProgressT] = useState(0);
  const tick = useRef(0);

  useEffect(() => {
    if (!activeJob) return;
    tick.current = 0;
    setDriverLat(activeJob.driverLat);
    setDriverLng(activeJob.driverLng);
    setEta(activeJob.etaMinutes);
    setProgressT(0);

    const initialFit = () => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: activeJob.driverLat, longitude: activeJob.driverLng },
          { latitude: activeJob.pickupLat, longitude: activeJob.pickupLng },
        ],
        {
          edgePadding: {
            top: insets.top + 100,
            right: 44,
            bottom: 260,
            left: 44,
          },
          animated: false,
        },
      );
    };
    requestAnimationFrame(initialFit);

    const id = setInterval(() => {
      tick.current += 1;
      const t = Math.min(1, tick.current / MOCK_TICKETS);
      setProgressT(t);
      setDriverLat(lerp(activeJob.driverLat, activeJob.pickupLat, t));
      setDriverLng(lerp(activeJob.driverLng, activeJob.pickupLng, t));
      setEta(Math.max(1, Math.round(activeJob.etaMinutes * (1 - t))));

      if (tick.current % 4 === 0) {
        mapRef.current?.fitToCoordinates(
          [
            {
              latitude: lerp(activeJob.driverLat, activeJob.pickupLat, t),
              longitude: lerp(activeJob.driverLng, activeJob.pickupLng, t),
            },
            {
              latitude: activeJob.pickupLat,
              longitude: activeJob.pickupLng,
            },
          ],
          {
            edgePadding: {
              top: insets.top + 100,
              right: 44,
              bottom: 260,
              left: 44,
            },
            animated: true,
          },
        );
      }
    }, MOCK_TICK_MS);

    return () => clearInterval(id);
  }, [activeJob, insets.top]);

  const startTrackingDemo = () => {
    beginActiveJob(
      buildMockActiveJob({
        jobId: `demo_track_${Date.now()}`,
        quoteTotal: 98.5,
        issueLabel: "Demo breakdown — mocked driver movement toward pickup",
        vehicleLabel: "Ford Focus · AB21 CDE",
      }),
    );
  };

  if (!activeJob) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>
          Nothing is being tracked right now — this screen is wired for demos with a fake GPS path
          (straight line toward pickup, no backend).
        </Text>
        <RLButton label="Run live tracking demo" onPress={startTrackingDemo} />
        <View style={{ height: space.md }} />
        <Pressable onPress={() => navigation.navigate("MainTabs")} hitSlop={12}>
          <Text style={styles.linkBack}>Back to home</Text>
        </Pressable>
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

  const routeLine = [
    { latitude: activeJob.driverLat, longitude: activeJob.driverLng },
    { latitude: activeJob.pickupLat, longitude: activeJob.pickupLng },
  ];
  const routeSoFar =
    progressT >= 1
      ? routeLine
      : [
          { latitude: activeJob.driverLat, longitude: activeJob.driverLng },
          { latitude: driverLat, longitude: driverLng },
        ];

  const statusTitle =
    progressT >= 0.96
      ? "Almost at pickup point"
      : activeJob.status === "en_route"
        ? "Operator en route"
        : "Job update";

  return (
    <View style={styles.flex}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        <Polyline
          coordinates={routeLine}
          strokeColor="rgba(249,115,22,0.35)"
          strokeWidth={10}
          lineDashPattern={Platform.OS === "ios" ? [12, 8] : undefined}
        />
        <Polyline
          coordinates={routeSoFar}
          strokeColor={colors.orange}
          strokeWidth={3}
        />
        <Marker
          coordinate={{ latitude: activeJob.pickupLat, longitude: activeJob.pickupLng }}
          title="Pickup"
          pinColor={colors.green}
        />
        <Marker
          coordinate={{ latitude: driverLat, longitude: driverLng }}
          title={activeJob.operatorName}
          description="Recovery truck (mock GPS)"
          pinColor={colors.orange}
        />
      </MapView>

      <View style={[styles.banner, { top: insets.top + space.sm }]}>
        <Text style={styles.bannerText}>{statusTitle}</Text>
        <Text style={styles.bannerEta}>
          ETA ~{eta} min · Demo path (straight line, no server)
        </Text>
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
  emptyText: {
    color: colors.textMuted,
    marginBottom: space.lg,
    lineHeight: 22,
    fontSize: 15,
  },
  linkBack: {
    color: colors.orange,
    fontWeight: "700",
    fontSize: 16,
    textAlign: "center",
  },
});
