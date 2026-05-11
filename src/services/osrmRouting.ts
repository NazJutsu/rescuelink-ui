import type { LatLng } from "../utils/geo";

export type OsrmDrivingRouteSummary = {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

type OsrmResponse = {
  code?: string;
  routes?: {
    distance?: number;
    duration?: number;
    geometry?: { type?: string; coordinates?: number[][] };
  }[];
};

const OSRM_DEMO_BASE = "https://router.project-osrm.org/route/v1/driving";

/**
 * Open-source OSRM public demo server (OpenStreetMap) — fair use only, no API key.
 * Coordinate order in URL is lon,lat pairs separated by ';'.
 */
export async function fetchOsrmDrivingRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<OsrmDrivingRouteSummary> {
  const lonLatPath = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
  const url = `${OSRM_DEMO_BASE}/${lonLatPath}?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Routing HTTP ${res.status}`);
  }

  const data = (await res.json()) as OsrmResponse;
  if (data.code !== "Ok" || data.routes?.length == null || data.routes.length < 1) {
    throw new Error("No driving route returned");
  }

  const route = data.routes[0];
  const raw = route.geometry?.coordinates;
  if (!Array.isArray(raw) || raw.length < 2) {
    throw new Error("Invalid route geometry");
  }

  const coordinates: LatLng[] = raw.map((pair) => {
    const [longitude, latitude] = pair;
    return { latitude, longitude };
  });

  const distanceMeters =
    typeof route.distance === "number" && Number.isFinite(route.distance)
      ? route.distance
      : 0;
  const durationSeconds =
    typeof route.duration === "number" && Number.isFinite(route.duration)
      ? route.duration
      : 0;

  return { coordinates, distanceMeters, durationSeconds };
}
