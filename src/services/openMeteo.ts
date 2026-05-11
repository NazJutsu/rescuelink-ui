export type WeatherIconKind =
  | "clear"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

export type OpenMeteoCurrent = {
  temperatureC: number;
  weatherCode: number;
  summary: string;
  iconKind: WeatherIconKind;
};

/** WMO Weather interpretation codes as used by Open-Meteo current weather. */
export function summarizeWmoWeatherCode(code: number): {
  summary: string;
  iconKind: WeatherIconKind;
} {
  if (code === 0) return { summary: "Clear sky", iconKind: "clear" };
  if (code === 1) return { summary: "Mainly clear", iconKind: "partly" };
  if (code === 2) return { summary: "Partly cloudy", iconKind: "partly" };
  if (code === 3) return { summary: "Overcast", iconKind: "cloud" };
  if (code === 45 || code === 48) return { summary: "Fog", iconKind: "fog" };
  if (code >= 51 && code <= 55) return { summary: "Drizzle", iconKind: "drizzle" };
  if (code === 56 || code === 57)
    return { summary: "Freezing drizzle", iconKind: "drizzle" };
  if (code >= 61 && code <= 67) return { summary: "Rain", iconKind: "rain" };
  if (code >= 71 && code <= 77) return { summary: "Snow", iconKind: "snow" };
  if (code >= 80 && code <= 82) return { summary: "Showers", iconKind: "rain" };
  if (code === 85 || code === 86)
    return { summary: "Snow showers", iconKind: "snow" };
  if (code >= 95 && code <= 99) {
    const summary =
      code === 96 || code === 99 ? "Thunderstorm hail" : "Thunderstorm";
    return { summary, iconKind: "storm" };
  }
  return { summary: "Weather", iconKind: "cloud" };
}

type OpenMeteoForecastJson = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

/**
 * Free tier: Open-Meteo community API — no API key, non-commercial /
 * attribution-friendly per https://open-meteo.com
 */
export async function fetchCurrentWeatherOpenMeteo(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<OpenMeteoCurrent> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });
  const url = `${OPEN_METEO_BASE}?${params.toString()}`;
  const res = await fetch(url, { signal });
  if (!res.ok)
    throw new Error(`Weather HTTP ${res.status}`);

  const body = (await res.json()) as OpenMeteoForecastJson;
  const cur = body.current;
  const temp =
    typeof cur?.temperature_2m === "number"
      ? cur.temperature_2m
      : NaN;
  const code =
    typeof cur?.weather_code === "number" ? cur.weather_code : 0;
  if (Number.isNaN(temp)) throw new Error("Malformed weather payload");

  const { summary, iconKind } = summarizeWmoWeatherCode(code);
  return {
    temperatureC: temp,
    weatherCode: code,
    summary,
    iconKind,
  };
}
