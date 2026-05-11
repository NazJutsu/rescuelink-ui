export type LatLng = { latitude: number; longitude: number };

/** Great-circle distance in miles (WGS84 sphere approx). */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3959;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

/** Rough road distance / ETA from straight-line miles (no Directions API). */
export function estimateRoadMilesAndMinutes(straightLineMiles: number): {
  roadMiles: number;
  minutes: number;
} {
  const roadMiles = straightLineMiles * 1.28;
  const minutes = Math.max(6, Math.round((roadMiles / 26) * 60));
  return { roadMiles, minutes };
}

/** Parse "lat, lng" typed by user (e.g. from GPS fallback). */
export function parseLatLngPair(text: string): LatLng | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  return { latitude, longitude };
}

export function formatCoordsLine(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
