/**
 * Free-first geocoding: Photon (Komoot public API / OSM), then device geocoder.
 */
import * as Location from "expo-location";
import type { LatLng } from "../utils/geo";
import { formatCoordsLine } from "../utils/geo";
import {
  photonFeatureToLabel,
  photonFeatureToLatLng,
  photonForwardBest,
  photonReverseBest,
} from "./photon";

function formatExpoAddress(g: Location.LocationGeocodedAddress): string {
  const line1 = [g.streetNumber, g.street].filter(Boolean).join(" ").trim();
  const parts = [
    line1 || g.name?.trim(),
    g.city,
    g.district,
    g.region,
    g.postalCode,
    g.country,
  ].filter((p): p is string => Boolean(p && String(p).trim()));
  const deduped: string[] = [];
  for (const p of parts) {
    const s = String(p).trim();
    if (!deduped.includes(s)) deduped.push(s);
  }
  return deduped.join(", ");
}

/** Resolve a typed address string to coordinates (Photon first, then Expo). */
export async function resolveForwardGeocode(query: string): Promise<LatLng> {
  const trimmed = query.trim();
  try {
    const hit = await photonForwardBest(trimmed);
    if (hit) return photonFeatureToLatLng(hit);
  } catch {
    // fall through to Expo
  }

  const pg = await Location.geocodeAsync(trimmed);
  if (!pg?.length) throw new Error("NOT_FOUND");
  return { latitude: pg[0].latitude, longitude: pg[0].longitude };
}

/** Human-readable address from GPS (Photon reverse first, then Expo). */
export async function reverseGeocodePickupLabel(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const hit = await photonReverseBest(latitude, longitude);
    const label = hit ? photonFeatureToLabel(hit).trim() : "";
    if (label.length > 0) return label;
  } catch {
    // fall through
  }

  try {
    const results = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });
    const place = results[0];
    if (place) {
      const line = formatExpoAddress(place).trim();
      if (line.length > 0) return line;
    }
  } catch {
    // ignore
  }

  return formatCoordsLine(latitude, longitude);
}
