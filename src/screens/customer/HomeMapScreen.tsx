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
import { BlurView } from "expo-blur";
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
import type { OperatorPin } from "../../mock/types";
import {
  seedNotifications,
  unreadNotificationsCount,
} from "../../mock/notificationsSeed";
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
import {
  fetchCurrentWeatherOpenMeteo,
  type OpenMeteoCurrent,
  type WeatherIconKind,
} from "../../services/openMeteo";
import { fetchOsrmDrivingRoute } from "../../services/osrmRouting";
import { greetingSalutation } from "../../utils/greeting";

function weatherIonicon(kind: WeatherIconKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "clear":
      return "sunny-outline";
    case "partly":
      return "partly-sunny-outline";
    case "cloud":
      return "cloudy-outline";
    case "fog":
      return "water-outline";
    case "drizzle":
      return "rainy-outline";
    case "rain":
      return "rainy-outline";
    case "snow":
      return "snow-outline";
    case "storm":
      return "thunderstorm-outline";
    default:
      return "cloudy-outline";
  }
}

const HOME_NOTIFICATION_BADGE_COUNT = unreadNotificationsCount(seedNotifications);

type RankedNearbyOperator = OperatorPin & {
  straightMiles: number;
  etaMinutesFromDistance: number;
};

type OperatorPickupRouteLegState = {
  operatorId: string;
  operatorName: string;
  coordinates: LatLng[];
  distanceMiles: number;
  durationMinutes: number;
  straightLineFallback: boolean;
};

const OPERATOR_TAP_DOUBLE_MS = 260;

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
  const [weatherSnap, setWeatherSnap] = useState<OpenMeteoCurrent | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [focusedOperatorId, setFocusedOperatorId] = useState<string | null>(null);
  const operatorTapPendingRef = useRef<{
    operatorId: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const operatorRouteAbortRef = useRef<AbortController | null>(null);
  const [operatorPickupRouteLeg, setOperatorPickupRouteLeg] =
    useState<OperatorPickupRouteLegState | null>(null);
  const [operatorPickupRouteLoading, setOperatorPickupRouteLoading] =
    useState(false);

  const wxLat = pickupCoords?.latitude ?? MAP_CENTER.latitude;
  const wxLon = pickupCoords?.longitude ?? MAP_CENTER.longitude;

  const greetingPrimary = user
    ? `${greetingSalutation()}, ${user.firstName}`
    : greetingSalutation();

  const greetingSubtitle = useMemo(() => {
    const pick = pickup.trim();
    if (pick && pickupCoords != null)
      return "Pickup pinned — check the map, then tap Request recovery when ready.";
    if (pick) return "Refine pickup or locate yourself, then send your request.";
    return "On-demand recovery nearby — start with where you're stuck.";
  }, [pickup, pickupCoords]);

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

  useEffect(
    () => () => {
      const p = operatorTapPendingRef.current;
      if (p) clearTimeout(p.timer);
      operatorTapPendingRef.current = null;
      operatorRouteAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const ac = new AbortController();
    setWeatherLoading(true);
    fetchCurrentWeatherOpenMeteo(wxLat, wxLon, ac.signal)
      .then((snap) => {
        if (!ac.signal.aborted) setWeatherSnap(snap);
      })
      .catch(() => {})
      .finally(() => {
        if (!ac.signal.aborted) setWeatherLoading(false);
      });
    return () => ac.abort();
  }, [wxLat, wxLon]);

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
            top: insets.top + 150,
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

  const previewPin = useMemo(
    (): LatLng =>
      pickupCoords != null
        ? {
            latitude: pickupCoords.latitude,
            longitude: pickupCoords.longitude,
          }
        : {
            latitude: MAP_CENTER.latitude,
            longitude: MAP_CENTER.longitude,
          },
    [pickupCoords],
  );

  useEffect(() => {
    operatorRouteAbortRef.current?.abort();
    setOperatorPickupRouteLeg(null);
    setOperatorPickupRouteLoading(false);
  }, [previewPin]);

  const operatorsRanked = useMemo((): RankedNearbyOperator[] => {
    const anchor = previewPin;
    return [...nearbyOperators]
      .map((op) => {
        const straightMiles = haversineMiles(anchor, {
          latitude: op.latitude,
          longitude: op.longitude,
        });
        const { minutes } = estimateRoadMilesAndMinutes(straightMiles);
        return {
          ...op,
          straightMiles,
          etaMinutesFromDistance: minutes,
        };
      })
      .sort((a, b) => a.straightMiles - b.straightMiles);
  }, [previewPin]);

  const collapseSheetForMapPreview = useCallback(() => {
    Animated.spring(translateY, {
      toValue: collapsedOffset,
      useNativeDriver: true,
      friction: 9,
      tension: 68,
    }).start();
  }, [collapsedOffset, translateY]);

  const focusOperatorOnMap = useCallback((op: OperatorPin) => {
    Keyboard.dismiss();
    setFocusedOperatorId(op.id);
    mapRef.current?.animateToRegion(
      {
        latitude: op.latitude,
        longitude: op.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      380,
    );
  }, []);

  const requestOperatorPickupRouteFromOp = useCallback(
    async (op: OperatorPin) => {
      Keyboard.dismiss();
      collapseSheetForMapPreview();
      operatorRouteAbortRef.current?.abort();
      const ac = new AbortController();
      operatorRouteAbortRef.current = ac;
      setFocusedOperatorId(op.id);
      setOperatorPickupRouteLoading(true);
      setOperatorPickupRouteLeg(null);

      const operatorCoord: LatLng = {
        latitude: op.latitude,
        longitude: op.longitude,
      };

      try {
        const summary = await fetchOsrmDrivingRoute(
          operatorCoord,
          previewPin,
          ac.signal,
        );

        const tripMiles = summary.distanceMeters * 0.000621371;
        const minsRounded = Math.max(
          1,
          Math.round(summary.durationSeconds / 60),
        );

        setOperatorPickupRouteLeg({
          operatorId: op.id,
          operatorName: op.name,
          coordinates: summary.coordinates,
          distanceMiles: tripMiles,
          durationMinutes: minsRounded,
          straightLineFallback: false,
        });
      } catch (e: unknown) {
        const aborted = e instanceof Error && e.name === "AbortError";
        if (aborted || ac.signal.aborted) return;

        const straightMi = haversineMiles(operatorCoord, previewPin);
        const { roadMiles, minutes } = estimateRoadMilesAndMinutes(straightMi);

        setOperatorPickupRouteLeg({
          operatorId: op.id,
          operatorName: op.name,
          coordinates: [operatorCoord, previewPin],
          distanceMiles: roadMiles,
          durationMinutes: minutes,
          straightLineFallback: true,
        });

        Alert.alert(
          "Road routing unavailable",
          "Showing a straight-line preview instead — OSRM’s public demo may be busy or offline.",
        );
      } finally {
        if (!ac.signal.aborted) setOperatorPickupRouteLoading(false);
      }
    },
    [collapseSheetForMapPreview, previewPin],
  );

  const handleOperatorTap = useCallback(
    (op: OperatorPin) => {
      const p = operatorTapPendingRef.current;
      if (p?.operatorId === op.id) {
        clearTimeout(p.timer);
        operatorTapPendingRef.current = null;
        void requestOperatorPickupRouteFromOp(op);
        return;
      }
      if (p) clearTimeout(p.timer);
      operatorTapPendingRef.current = {
        operatorId: op.id,
        timer: setTimeout(() => {
          operatorTapPendingRef.current = null;
          focusOperatorOnMap(op);
        }, OPERATOR_TAP_DOUBLE_MS),
      };
    },
    [focusOperatorOnMap, requestOperatorPickupRouteFromOp],
  );

  useEffect(() => {
    const coords = operatorPickupRouteLeg?.coordinates;
    if (!coords?.length) return;

    const bottomPad = collapsedSheet + 70;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: {
        top: insets.top + 150,
        right: 32,
        bottom: bottomPad,
        left: 32,
      },
      animated: true,
    });
  }, [collapsedSheet, insets.top, operatorPickupRouteLeg]);

  const showRouteChip = pickup.trim().length > 0 && dropoff.trim().length > 0;
  const CHIP_BASE_TOP = insets.top + 136;
  const operatorAssistChipTop = CHIP_BASE_TOP + (showRouteChip ? 102 : 0);

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
        {operatorsRanked.map((op) => (
          <Marker
            key={op.id}
            coordinate={{ latitude: op.latitude, longitude: op.longitude }}
            title={op.name}
            description={`Tap twice for route to pickup · ~${op.straightMiles.toFixed(1)} mi`}
            pinColor={focusedOperatorId === op.id ? "#a3e635" : colors.orange}
            onPress={() => handleOperatorTap(op)}
          />
        ))}
        {operatorPickupRouteLeg?.coordinates?.length ? (
          <Polyline
            coordinates={operatorPickupRouteLeg.coordinates}
            strokeColor="#38bdf8"
            strokeWidth={4}
            lineDashPattern={
              operatorPickupRouteLeg.straightLineFallback
                ? [10, 6]
                : Platform.OS === "ios"
                  ? [14, 10]
                  : undefined
            }
          />
        ) : null}
      </MapView>

      {showRouteChip ? (
        <View
          pointerEvents="box-none"
          style={[styles.routeChipWrap, { top: CHIP_BASE_TOP }]}
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

      {operatorPickupRouteLoading || operatorPickupRouteLeg ? (
        <View
          pointerEvents="box-none"
          style={[styles.routeChipWrap, { top: operatorAssistChipTop }]}
        >
          <View style={[styles.routeChip, styles.operatorRouteAssistChip]}>
            {operatorPickupRouteLoading ? (
              <View style={styles.routeChipRow}>
                <ActivityIndicator color="#38bdf8" size="small" />
                <Text style={[styles.routeChipMain, styles.operatorRouteAssistTitle]}>
                  Plotting route toward you…
                </Text>
              </View>
            ) : operatorPickupRouteLeg ? (
              <>
                <Text style={[styles.routeChipMain, styles.operatorRouteAssistTitle]} numberOfLines={2}>
                  {operatorPickupRouteLeg.operatorName}: ~{operatorPickupRouteLeg.distanceMiles.toFixed(1)}{" "}
                  mi · ~{operatorPickupRouteLeg.durationMinutes} min
                </Text>
                <Text style={styles.routeChipSub}>
                  {operatorPickupRouteLeg.straightLineFallback
                    ? "Straight-line estimate — routing service unavailable."
                    : "Driving route preview to your pickup pin (OpenStreetMap / OSRM demo — not assignment)."}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      <View
        style={[styles.headerGlassAnchor, { top: insets.top + space.sm }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerGlassCard}>
          <BlurView
            intensity={Platform.OS === "ios" ? 56 : 42}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerGlassScrim} pointerEvents="none" />
          <View style={styles.headerGlassInner}>
            <View style={styles.topRow}>
              <View style={styles.greetCopy}>
                <Text style={styles.greet}>{greetingPrimary}</Text>
                <Text style={styles.greetSub}>{greetingSubtitle}</Text>
              </View>
              <View style={styles.bellWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  style={styles.bell}
                  onPress={() => rootNav?.navigate("Notifications")}
                >
                  <Ionicons name="notifications-outline" size={22} color={colors.text} />
                </Pressable>
                {HOME_NOTIFICATION_BADGE_COUNT > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText} numberOfLines={1}>
                      {HOME_NOTIFICATION_BADGE_COUNT > 9
                        ? "9+"
                        : String(HOME_NOTIFICATION_BADGE_COUNT)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View
              accessibilityLabel={
                weatherSnap
                  ? `Weather: ${Math.round(weatherSnap.temperatureC)} degrees Celsius, ${weatherSnap.summary}`
                  : "Weather forecast"
              }
              style={styles.weatherRow}
            >
            {weatherSnap ? (
              <>
                <Ionicons
                  name={weatherIonicon(weatherSnap.iconKind)}
                  size={18}
                  color={colors.orange}
                />
                <Text style={styles.weatherTemp}>
                  {Math.round(weatherSnap.temperatureC)}°
                </Text>
                <Text style={styles.weatherWords} numberOfLines={1}>
                  {weatherSnap.summary}
                </Text>
                <Text style={styles.weatherWhere} numberOfLines={1}>
                  {pickupCoords ? "\u2022 pickup" : "\u2022 map area"}
                </Text>
              </>
            ) : weatherLoading ? (
              <ActivityIndicator color={colors.textMuted} size="small" />
            ) : (
              <Text style={styles.weatherUnavailable}>
                Weather unavailable · Open-Meteo
              </Text>
            )}
            </View>
          </View>
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
            scrollEnabled
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
            scrollEnabled
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

          <View style={styles.opSectionHead}>
            <Text style={[styles.label, styles.labelPlain]}>Nearby operators</Text>
            <Text style={styles.opExplain} numberOfLines={3}>
              Sorted by miles from pickup{pickupCoords ? "" : " (map preview)"}. Tap a card once to zoom the map — double‑tap quickly to collapse the sheet, plot driving route toward you, and focus the map.
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.strip}
          >
            {operatorsRanked.map((item) => {
              const isFocused = focusedOperatorId === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityHint="Tap once to zoom the map on this operator — double‑tap slides the sheet down and plots their route toward your pickup"
                  accessibilityLabel={`${item.name}, ${item.straightMiles.toFixed(1)} miles, about ${item.etaMinutesFromDistance} minutes`}
                  onPress={() => handleOperatorTap(item)}
                  style={({ pressed }) => [
                    styles.opCard,
                    isFocused && styles.opCardFocused,
                    pressed && styles.opCardPressed,
                  ]}
                >
                  <View style={styles.opAvatar}>
                    <Text style={styles.opAvatarText}>{item.avatarInitials}</Text>
                  </View>
                  <Text style={styles.opName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.opDistanceEta} numberOfLines={2}>
                    ~{item.straightMiles.toFixed(1)} mi · ~{item.etaMinutesFromDistance} min
                  </Text>
                  <View style={styles.opGearRow}>
                    {item.flatbed ? (
                      <View style={styles.opChip}>
                        <Ionicons name="car-sport-outline" size={11} color={colors.orange} />
                        <Text style={styles.opChipLabel}>Flatbed</Text>
                      </View>
                    ) : null}
                    {item.winch ? (
                      <View style={styles.opChip}>
                        <Ionicons name="link-outline" size={11} color={colors.orange} />
                        <Text style={styles.opChipLabel}>Winch</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.opRating}>★ {item.rating.toFixed(1)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <RLButton
            label="Request recovery"
            onPress={requestRecovery}
            disabled={!pickup.trim()}
            style={{ marginTop: space.md }}
          />
          <Text style={styles.geoAttribution}>
            Address search: Photon (Komoot, free tier) & OpenStreetMap — falls back to your
            device geocoder if needed. Weather via Open‑Meteo (free API). Operator driving preview:
            OSRM public demo routing (coordinates only · not turn-by-turn nav).
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
  operatorRouteAssistChip: {
    borderLeftWidth: 4,
    borderLeftColor: "#38bdf8",
  },
  operatorRouteAssistTitle: {
    fontSize: 15,
    color: "#e0f2fe",
  },
  headerGlassAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 4,
  },
  headerGlassCard: {
    overflow: "hidden",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  headerGlassScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,15,0.48)",
  },
  headerGlassInner: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: space.md,
  },
  greetCopy: { flex: 1, minWidth: 0, paddingRight: space.xs },
  greet: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  greetSub: {
    color: colors.text,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bellWrap: { position: "relative", flexShrink: 0 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    right: -2,
    top: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(10,10,15,0.92)",
  },
  bellBadgeText: {
    color: colors.bg,
    fontSize: 10,
    fontWeight: "800",
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 6,
    rowGap: 4,
    marginTop: space.sm,
  },
  weatherTemp: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  weatherWords: {
    flexShrink: 1,
    flexGrow: 1,
    minWidth: "40%",
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  weatherWhere: {
    color: "rgba(241,240,238,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  weatherUnavailable: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: "500",
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
    paddingHorizontal: space.md,
    paddingVertical: 7,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 44,
    maxHeight: 76,
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
  opSectionHead: {
    marginTop: space.lg,
    marginBottom: space.xs,
    gap: 4,
  },
  labelPlain: {
    marginBottom: 0,
  },
  opExplain: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: "500",
  },
  opCard: {
    width: 138,
    backgroundColor: colors.surface2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  opCardFocused: {
    borderColor: colors.borderOrange,
    borderWidth: 1.5,
    backgroundColor: colors.orangeFaint,
    shadowColor: colors.orange,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  opCardPressed: {
    opacity: 0.92,
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
  opDistanceEta: {
    color: colors.orange,
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 15,
  },
  opGearRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: space.sm,
  },
  opChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surface3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderOrange,
  },
  opChipLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  opRating: { color: colors.textMuted, marginTop: space.sm, fontSize: 12 },
  geoAttribution: {
    color: colors.textFaint,
    fontSize: 10,
    lineHeight: 14,
    marginTop: space.md,
    textAlign: "center",
  },
});
