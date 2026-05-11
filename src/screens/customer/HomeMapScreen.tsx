import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Circle, Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RLButton } from "../../components/ui";
import { useApp } from "../../context/AppContext";
import {
  ADDRESS_DROPOFF_PLACEHOLDER,
  ADDRESS_PICKUP_PLACEHOLDER,
  MAP_CENTER,
  nearbyOperators,
} from "../../mock/customerSeed";
import type { RootStackParamList } from "../../navigation/types";
import { colors, radii, space } from "../../theme/tokens";
import {
  estimateRoadMilesAndMinutes,
  formatCoordsLine,
  haversineMiles,
  parseLatLngPair,
  type LatLng,
} from "../../utils/geo";
import {
  resolveForwardGeocode,
  reverseGeocodePickupLabel,
} from "../../services/geocoding";
import {
  type PhotonFeature,
  photonFeatureToLabel,
  photonFeatureToLatLng,
  photonSearch,
} from "../../services/photon";

function photonFeatureKey(f: PhotonFeature, index: number): string {
  const p = f.properties;
  const id = p.osm_id;
  const typ = p.osm_type;
  if (typeof id === "number" && typeof typ === "string") return `${typ}-${id}`;
  const [lon, lat] = f.geometry.coordinates;
  return `${lat}-${lon}-${index}`;
}

export function HomeMapScreen() {
  const insets = useSafeAreaInsets();
  const window = Dimensions.get("window");
  const expandedSheet = window.height * 0.72;
  const collapsedSheet = 118 + insets.bottom;
  const collapsedOffset = Math.max(0, expandedSheet - collapsedSheet);

  const mapRef = useRef<MapView>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const dragStartRef = useRef(0);

  const { user } = useApp();
  const nav = useNavigation();
  const rootNav = nav.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [locatingPickup, setLocatingPickup] = useState(false);

  const [routeEndpoints, setRouteEndpoints] = useState<{
    from: LatLng;
    to: LatLng;
  } | null>(null);
  const [routeEstimate, setRouteEstimate] = useState<{
    roadMiles: number;
    minutes: number;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeErrMessage, setRouteErrMessage] = useState<string | null>(null);

  const [activeAddressField, setActiveAddressField] = useState<
    "pickup" | "dropoff" | null
  >(null);
  const [addressSuggestions, setAddressSuggestions] = useState<PhotonFeature[]>(
    [],
  );
  const [addressSuggestLoading, setAddressSuggestLoading] = useState(false);
  const blurClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const greeting = user
    ? `Hi, ${user.firstName}`
    : "Welcome";

  const cancelSuggestionBlurClear = useCallback(() => {
    if (blurClearTimerRef.current != null) {
      clearTimeout(blurClearTimerRef.current);
      blurClearTimerRef.current = null;
    }
  }, []);

  const scheduleSuggestionBlurClear = useCallback(() => {
    cancelSuggestionBlurClear();
    blurClearTimerRef.current = setTimeout(() => {
      blurClearTimerRef.current = null;
      setActiveAddressField(null);
      setAddressSuggestions([]);
    }, 280);
  }, [cancelSuggestionBlurClear]);

  const onPickupTyping = useCallback((text: string) => {
    setPickup(text);
    setPickupCoords(null);
  }, []);

  const selectPickupSuggestion = useCallback(
    (f: PhotonFeature) => {
      cancelSuggestionBlurClear();
      const ll = photonFeatureToLatLng(f);
      const label = photonFeatureToLabel(f).trim();
      setPickup(
        label.length > 0 ? label : formatCoordsLine(ll.latitude, ll.longitude),
      );
      setPickupCoords(ll);
      setAddressSuggestions([]);
      setActiveAddressField(null);
      Keyboard.dismiss();
      mapRef.current?.animateToRegion(
        {
          ...ll,
          latitudeDelta: MAP_CENTER.latitudeDelta,
          longitudeDelta: MAP_CENTER.longitudeDelta,
        },
        350,
      );
    },
    [cancelSuggestionBlurClear],
  );

  const selectDropoffSuggestion = useCallback(
    (f: PhotonFeature) => {
      cancelSuggestionBlurClear();
      const ll = photonFeatureToLatLng(f);
      const label = photonFeatureToLabel(f).trim();
      setDropoff(
        label.length > 0 ? label : formatCoordsLine(ll.latitude, ll.longitude),
      );
      setAddressSuggestions([]);
      setActiveAddressField(null);
      Keyboard.dismiss();
    },
    [cancelSuggestionBlurClear],
  );

  useEffect(() => {
    if (!activeAddressField) {
      setAddressSuggestions([]);
      setAddressSuggestLoading(false);
      return;
    }

    const q =
      activeAddressField === "pickup" ? pickup.trim() : dropoff.trim();

    if (q.length < 2) {
      setAddressSuggestions([]);
      setAddressSuggestLoading(false);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(async () => {
      setAddressSuggestLoading(true);
      try {
        const hits = await photonSearch(q, 8, ac.signal);
        if (!ac.signal.aborted) setAddressSuggestions(hits);
      } catch (e: unknown) {
        const aborted = e instanceof Error && e.name === "AbortError";
        if (aborted) return;
        if (!ac.signal.aborted) setAddressSuggestions([]);
      } finally {
        if (!ac.signal.aborted) setAddressSuggestLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [activeAddressField, pickup, dropoff]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          translateY.stopAnimation((v) => {
            dragStartRef.current = v;
          });
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(
            collapsedOffset,
            Math.max(0, dragStartRef.current + g.dy),
          );
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          translateY.stopAnimation((current) => {
            const halfway = collapsedOffset / 2;
            const snapDown = current > halfway || g.vy > 0.35;
            const to = snapDown ? collapsedOffset : 0;
            Animated.spring(translateY, {
              toValue: to,
              useNativeDriver: true,
              friction: 9,
              tension: 68,
            }).start();
          });
        },
      }),
    [collapsedOffset, translateY],
  );

  useEffect(() => {
    const pick = pickup.trim();
    const drop = dropoff.trim();
    if (!pick || !drop) {
      setRouteEndpoints(null);
      setRouteEstimate(null);
      setRouteErrMessage(null);
      setRouteLoading(false);
      return;
    }

    const handle = setTimeout(async () => {
      setRouteLoading(true);
      setRouteErrMessage(null);
      try {
        let from: LatLng | null = pickupCoords;
        if (!from) {
          const parsedPick = parseLatLngPair(pick);
          if (parsedPick) from = parsedPick;
          else {
            from = await resolveForwardGeocode(pick);
          }
        }

        let to: LatLng | null = parseLatLngPair(drop);
        if (!to) {
          to = await resolveForwardGeocode(drop);
        }

        const straight = haversineMiles(from, to);
        const { roadMiles, minutes } = estimateRoadMilesAndMinutes(straight);

        setRouteEstimate({ roadMiles, minutes });
        setRouteEndpoints({ from, to });

        const bottomPad = Math.min(expandedSheet * 0.52, 360);
        mapRef.current?.fitToCoordinates([from, to], {
          edgePadding: {
            top: insets.top + 108,
            right: 36,
            bottom: bottomPad,
            left: 36,
          },
          animated: true,
        });
      } catch {
        setRouteEndpoints(null);
        setRouteEstimate(null);
        setRouteErrMessage("Couldn't plot route — check addresses");
      } finally {
        setRouteLoading(false);
      }
    }, 650);

    return () => clearTimeout(handle);
  }, [
    pickup,
    dropoff,
    pickupCoords,
    expandedSheet,
    insets.top,
  ]);

  const useCurrentLocationForPickup = useCallback(async () => {
    setLocatingPickup(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          "Location needed",
          "Allow location access to fill your pickup from where you are now.",
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;

      const line = await reverseGeocodePickupLabel(latitude, longitude);
      setPickup(line.trim().length > 0 ? line.trim() : formatCoordsLine(latitude, longitude));
      setPickupCoords({ latitude, longitude });

      const region = {
        latitude,
        longitude,
        latitudeDelta: MAP_CENTER.latitudeDelta,
        longitudeDelta: MAP_CENTER.longitudeDelta,
      };
      mapRef.current?.animateToRegion(region, 450);
    } catch (e) {
      Alert.alert(
        "Could not get location",
        e instanceof Error ? e.message : "Try again or type your pickup address.",
      );
    } finally {
      setLocatingPickup(false);
    }
  }, []);

  const requestRecovery = useCallback(() => {
    rootNav?.navigate("BookingFlow", {
      pickupLabel: pickup.trim() || undefined,
      dropoffLabel: dropoff.trim() || undefined,
    });
  }, [dropoff, pickup, rootNav]);

  const previewPin = pickupCoords ?? {
    latitude: MAP_CENTER.latitude,
    longitude: MAP_CENTER.longitude,
  };

  const showRouteChip = pickup.trim().length > 0 && dropoff.trim().length > 0;

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={MAP_CENTER}
        customMapStyle={darkMapStyle}
      >
        {routeEndpoints ? (
          <>
            <Polyline
              coordinates={[routeEndpoints.from, routeEndpoints.to]}
              strokeColor={colors.orange}
              strokeWidth={3}
              lineDashPattern={Platform.OS === "ios" ? [10, 8] : undefined}
            />
            <Marker coordinate={routeEndpoints.from} title="Pickup" pinColor={colors.orange} />
            <Marker coordinate={routeEndpoints.to} title="Drop-off" pinColor="#34d399" />
          </>
        ) : (
          <>
            <Circle
              center={previewPin}
              radius={90}
              strokeColor={colors.borderOrange}
              fillColor={colors.orangeGlow}
            />
            <Marker
              coordinate={previewPin}
              title={pickupCoords ? "Your pickup" : "Area preview"}
            />
          </>
        )}
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

      {showRouteChip ? (
        <View
          pointerEvents="box-none"
          style={[styles.routeChipWrap, { top: insets.top + 72 }]}
        >
          <View style={styles.routeChip}>
            {routeLoading ? (
              <View style={styles.routeChipRow}>
                <ActivityIndicator color={colors.orange} size="small" />
                <Text style={styles.routeChipMain}>Working out distance…</Text>
              </View>
            ) : routeErrMessage ? (
              <Text style={styles.routeChipError}>{routeErrMessage}</Text>
            ) : routeEstimate ? (
              <>
                <Text style={styles.routeChipMain}>
                  ~{routeEstimate.roadMiles.toFixed(1)} mi · ~
                  {routeEstimate.minutes} min
                </Text>
                <Text style={styles.routeChipSub}>
                  Estimated driving distance & time (not turn-by-turn) · addresses via Photon /
                  OSM
                </Text>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

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

      <Animated.View
        style={[
          styles.sheet,
          {
            height: expandedSheet,
            paddingBottom: insets.bottom + space.md,
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.sheetHandle}>
          <View style={styles.grabber} />
          <Text style={styles.handleHint}>Drag down to show the map</Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScrollContent}
        >
          <View style={styles.labelRow}>
            <Text style={styles.labelFlat}>Pickup</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use current location for pickup"
              onPress={useCurrentLocationForPickup}
              disabled={locatingPickup}
              style={({ pressed }) => [
                styles.locBtn,
                locatingPickup && styles.locBtnDisabled,
                pressed && styles.locBtnPressed,
              ]}
            >
              {locatingPickup ? (
                <ActivityIndicator color={colors.orange} size="small" />
              ) : (
                <Ionicons name="locate" size={18} color={colors.orange} />
              )}
              <Text style={styles.locBtnText}>Current location</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.inputMultiline}
            placeholder={ADDRESS_PICKUP_PLACEHOLDER}
            placeholderTextColor={colors.textFaint}
            value={pickup}
            onChangeText={onPickupTyping}
            onFocus={() => {
              cancelSuggestionBlurClear();
              setActiveAddressField("pickup");
            }}
            onBlur={scheduleSuggestionBlurClear}
            autoCorrect={false}
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            multiline
            textAlignVertical="top"
          />
          {activeAddressField === "pickup" &&
          (addressSuggestLoading || addressSuggestions.length > 0) ? (
            <View style={styles.suggestionPanel}>
              {addressSuggestLoading ? (
                <View style={styles.suggestionLoading}>
                  <ActivityIndicator size="small" color={colors.orange} />
                  <Text style={styles.suggestionLoadingText}>Searching…</Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={styles.suggestionList}
                  showsVerticalScrollIndicator={false}
                >
                  {addressSuggestions.map((f, i) => {
                    const ll = photonFeatureToLatLng(f);
                    const label = photonFeatureToLabel(f).trim();
                    const line =
                      label.length > 0
                        ? label
                        : formatCoordsLine(ll.latitude, ll.longitude);
                    return (
                      <Pressable
                        key={photonFeatureKey(f, i)}
                        onPressIn={cancelSuggestionBlurClear}
                        onPress={() => selectPickupSuggestion(f)}
                        style={({ pressed }) => [
                          styles.suggestionRow,
                          pressed && styles.suggestionRowPressed,
                        ]}
                      >
                        <Text style={styles.suggestionText} numberOfLines={3}>
                          {line}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}

          <Text style={[styles.label, { marginTop: space.sm }]}>
            Drop-off (optional)
          </Text>
          <TextInput
            style={styles.inputMultiline}
            placeholder={ADDRESS_DROPOFF_PLACEHOLDER}
            placeholderTextColor={colors.textFaint}
            value={dropoff}
            onChangeText={setDropoff}
            onFocus={() => {
              cancelSuggestionBlurClear();
              setActiveAddressField("dropoff");
            }}
            onBlur={scheduleSuggestionBlurClear}
            autoCorrect={false}
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            multiline
            textAlignVertical="top"
          />
          {activeAddressField === "dropoff" &&
          (addressSuggestLoading || addressSuggestions.length > 0) ? (
            <View style={styles.suggestionPanel}>
              {addressSuggestLoading ? (
                <View style={styles.suggestionLoading}>
                  <ActivityIndicator size="small" color={colors.orange} />
                  <Text style={styles.suggestionLoadingText}>Searching…</Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={styles.suggestionList}
                  showsVerticalScrollIndicator={false}
                >
                  {addressSuggestions.map((f, i) => {
                    const ll = photonFeatureToLatLng(f);
                    const label = photonFeatureToLabel(f).trim();
                    const line =
                      label.length > 0
                        ? label
                        : formatCoordsLine(ll.latitude, ll.longitude);
                    return (
                      <Pressable
                        key={photonFeatureKey(f, i)}
                        onPressIn={cancelSuggestionBlurClear}
                        onPress={() => selectDropoffSuggestion(f)}
                        style={({ pressed }) => [
                          styles.suggestionRow,
                          pressed && styles.suggestionRowPressed,
                        ]}
                      >
                        <Text style={styles.suggestionText} numberOfLines={3}>
                          {line}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          ) : null}

          <Text style={[styles.label, { marginTop: space.lg }]}>
            Nearby operators
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {nearbyOperators.map((item) => (
              <View key={item.id} style={styles.opCard}>
                <View style={styles.opAvatar}>
                  <Text style={styles.opAvatarText}>{item.avatarInitials}</Text>
                </View>
                <Text style={styles.opName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.opEta}>{item.etaMinutes} min</Text>
                <Text style={styles.opRating}>★ {item.rating.toFixed(1)}</Text>
              </View>
            ))}
          </ScrollView>

          <RLButton
            label="Request recovery"
            onPress={requestRecovery}
            disabled={!pickup.trim()}
            style={{ marginTop: space.md }}
          />
          <Text style={styles.geoAttribution}>
            Address search: Photon (Komoot, free tier) & OpenStreetMap — falls back to your
            device geocoder if needed.
          </Text>
        </ScrollView>
      </Animated.View>
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
  routeChipWrap: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    zIndex: 5,
  },
  routeChip: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  routeChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  routeChipMain: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 17,
  },
  routeChipSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  routeChipError: {
    color: colors.red,
    fontWeight: "600",
    fontSize: 14,
  },
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: space.xl,
    zIndex: 4,
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 6,
  },
  sheetHandle: {
    alignItems: "center",
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.55,
  },
  handleHint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: space.xs,
  },
  sheetScrollContent: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xs,
  },
  labelFlat: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  label: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: space.xs,
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    backgroundColor: colors.orangeFaint,
  },
  locBtnPressed: { opacity: 0.88 },
  locBtnDisabled: { opacity: 0.55 },
  locBtnText: { color: colors.orange, fontWeight: "700", fontSize: 13 },
  inputMultiline: {
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: colors.text,
    fontSize: 15,
    minHeight: 88,
  },
  suggestionPanel: {
    marginTop: space.xs,
    marginBottom: space.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    overflow: "hidden",
  },
  suggestionList: {
    maxHeight: 220,
  },
  suggestionLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
  },
  suggestionLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  suggestionRow: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionRowPressed: {
    backgroundColor: colors.surface3,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  strip: {
    flexDirection: "row",
    gap: space.sm,
    paddingVertical: space.sm,
  },
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
  geoAttribution: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 14,
    marginTop: space.md,
    textAlign: "center",
  },
});
