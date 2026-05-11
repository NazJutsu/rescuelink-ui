import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import {
  MAP_CENTER,
  MOCK_DROPOFF_LABEL,
  MOCK_PICKUP_LABEL,
  nearbyOperators,
} from "../../mock/customerSeed";
import type { RootStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";

export function HomeMapScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const nav = useNavigation();
  const rootNav = nav
    .getParent()
    ?.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;

  const greeting = user
    ? `Hi, ${user.firstName}`
    : "Welcome";

  return (
    <View style={styles.flex}>
      <MapView
        style={styles.map}
        initialRegion={MAP_CENTER}
        customMapStyle={darkMapStyle}
      >
        <Circle
          center={{ latitude: MAP_CENTER.latitude, longitude: MAP_CENTER.longitude }}
          radius={90}
          strokeColor={colors.borderOrange}
          fillColor={colors.orangeGlow}
        />
        <Marker
          coordinate={{
            latitude: MAP_CENTER.latitude,
            longitude: MAP_CENTER.longitude,
          }}
          title="You"
        />
        {nearbyOperators.map((op) => (
          <Marker
            key={op.id}
            coordinate={{ latitude: op.latitude, longitude: op.longitude }}
            title={op.name}
            description={`${op.etaMinutes} min`}
            pinColor={colors.orange}
          />
        ))}
      </MapView>

      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greet}>{greeting}</Text>
            <Text style={styles.greetSub}>On-demand recovery nearby</Text>
          </View>
          <Pressable style={styles.bell} accessibilityRole="button">
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
        <Text style={styles.label}>Pickup</Text>
        <TextInput
          style={styles.input}
          placeholder={MOCK_PICKUP_LABEL}
          placeholderTextColor={colors.textFaint}
          editable={false}
        />
        <Text style={[styles.label, { marginTop: space.sm }]}>Drop-off (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder={MOCK_DROPOFF_LABEL}
          placeholderTextColor={colors.textFaint}
          editable={false}
        />

        <Text style={[styles.label, { marginTop: space.lg }]}>Nearby operators</Text>
        <FlatList
          horizontal
          data={nearbyOperators}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
          renderItem={({ item }) => (
            <View style={styles.opCard}>
              <View style={styles.opAvatar}>
                <Text style={styles.opAvatarText}>{item.avatarInitials}</Text>
              </View>
              <Text style={styles.opName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.opEta}>{item.etaMinutes} min</Text>
              <Text style={styles.opRating}>★ {item.rating.toFixed(1)}</Text>
            </View>
          )}
        />

        <RLButton
          label="Request recovery"
          onPress={() => rootNav?.navigate("BookingFlow")}
          style={{ marginTop: space.md }}
        />
      </View>
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d1c20" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b8a88" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0a0f" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a292e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f172a" }],
  },
];

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: space.xl,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greet: { color: colors.white, fontSize: 22, fontWeight: "800" },
  greetSub: { color: colors.textMuted, marginTop: 2 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: "auto",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: space.xs,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: colors.text,
    fontSize: 15,
  },
  strip: { gap: space.sm, paddingVertical: space.sm },
  opCard: {
    width: 120,
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  opAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.orangeFaint,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  opAvatarText: { color: colors.orange, fontWeight: "800", fontSize: 12 },
  opName: { color: colors.white, fontWeight: "700", fontSize: 13 },
  opEta: { color: colors.orange, fontWeight: "700", marginTop: 4 },
  opRating: { color: colors.textMuted, marginTop: 2, fontSize: 12 },
});
