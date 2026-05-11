/**
 * Photon geocoder (Komoot public instance — free, OSM data).
 * Override with EXPO_PUBLIC_PHOTON_BASE_URL if you self-host.
 * @see https://github.com/komoot/photon
 */

import type { LatLng } from "../utils/geo";

const DEFAULT_BASE = "https://photon.komoot.io";

export type PhotonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
};

export function getPhotonBaseUrl(): string {
  const raw =
    typeof process !== "undefined"
      ? process.env.EXPO_PUBLIC_PHOTON_BASE_URL
      : undefined;
  const trimmed = raw != null ? String(raw).trim() : "";
  if (trimmed.length > 0) return trimmed.replace(/\/$/, "");
  return DEFAULT_BASE;
}

function strProp(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function photonFeatureToLatLng(f: PhotonFeature): LatLng {
  const [lon, lat] = f.geometry.coordinates;
  return { latitude: lat, longitude: lon };
}

/** Single-line postal-style label from Photon/OSM properties. */
export function photonFeatureToLabel(f: PhotonFeature): string {
  const p = f.properties;
  const hn = strProp(p.housenumber);
  const st = strProp(p.street);
  const streetLine = [hn, st].filter(Boolean).join(" ").trim();
  const parts = [
    streetLine.length > 0 ? streetLine : strProp(p.name),
    strProp(p.city) ?? strProp(p.district) ?? strProp(p.locality),
    strProp(p.postcode),
    strProp(p.state),
    strProp(p.country),
  ].filter((x): x is string => Boolean(x));

  const dedup: string[] = [];
  for (const part of parts) {
    const t = part.trim();
    if (!dedup.some((d) => d.toLowerCase() === t.toLowerCase())) dedup.push(t);
  }
  return dedup.join(", ");
}

async function photonGet(
  pathAndQuery: string,
  signal?: AbortSignal,
): Promise<PhotonFeature[]> {
  const base = getPhotonBaseUrl();
  const url = `${base}${pathAndQuery}`;
  const res = await fetch(url, signal ? { signal } : undefined);
  if (!res.ok) {
    throw new Error(`Photon HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    features?: PhotonFeature[];
  };
  const features = json.features;
  return Array.isArray(features) ? features : [];
}

/** Forward search — returns ranked candidates (best first). */
export async function photonSearch(
  query: string,
  limit = 6,
  signal?: AbortSignal,
): Promise<PhotonFeature[]> {
  const q = query.trim();
  if (!q) return [];
  const path = `/api?q=${encodeURIComponent(q)}&limit=${limit}&lang=en`;
  return photonGet(path, signal);
}

export async function photonForwardBest(query: string): Promise<PhotonFeature | null> {
  const hits = await photonSearch(query, 5);
  return hits[0] ?? null;
}

export async function photonReverseBest(
  latitude: number,
  longitude: number,
): Promise<PhotonFeature | null> {
  const path = `/reverse?lat=${encodeURIComponent(String(latitude))}&lon=${encodeURIComponent(String(longitude))}&lang=en`;
  const hits = await photonGet(path);
  return hits[0] ?? null;
}
