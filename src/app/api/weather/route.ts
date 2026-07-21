import { NextResponse } from "next/server";

type OpenMeteoResponse = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    precipitation: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    uv_index: number[];
    precipitation_probability: number[];
  };
  daily: {
    uv_index_max: number[];
  };
};

function validCoordinate(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitudeParam = searchParams.get("lat");
  const longitudeParam = searchParams.get("lon");
  const latitude = Number(latitudeParam);
  const longitude = Number(longitudeParam);

  if (
    latitudeParam === null ||
    longitudeParam === null ||
    !validCoordinate(latitude, -90, 90) ||
    !validCoordinate(longitude, -180, 180)
  ) {
    return NextResponse.json(
      { error: "Coordenadas invalidas" },
      { status: 400 },
    );
  }

  const apiUrl = new URL("https://api.open-meteo.com/v1/forecast");
  apiUrl.searchParams.set("latitude", latitude.toFixed(5));
  apiUrl.searchParams.set("longitude", longitude.toFixed(5));
  apiUrl.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,weather_code,precipitation,is_day",
  );
  apiUrl.searchParams.set("hourly", "uv_index,precipitation_probability");
  apiUrl.searchParams.set("daily", "uv_index_max");
  apiUrl.searchParams.set("timezone", "auto");
  apiUrl.searchParams.set("forecast_days", "1");

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 1800 } });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const forecast = (await response.json()) as OpenMeteoResponse;
    const currentHour = `${forecast.current.time.slice(0, 13)}:00`;
    const hourIndex = Math.max(0, forecast.hourly.time.indexOf(currentHour));
    const rainChance = Math.max(
      ...forecast.hourly.precipitation_probability.slice(
        hourIndex,
        Math.min(hourIndex + 6, forecast.hourly.time.length),
      ),
    );

    return NextResponse.json({
      uvIndex: forecast.hourly.uv_index[hourIndex] ?? 0,
      uvMax: forecast.daily.uv_index_max[0] ?? 0,
      temperature: forecast.current.temperature_2m,
      apparentTemperature: forecast.current.apparent_temperature,
      weatherCode: forecast.current.weather_code,
      precipitation: forecast.current.precipitation,
      rainChance: Number.isFinite(rainChance) ? rainChance : 0,
      isDay: forecast.current.is_day === 1,
      observedAt: forecast.current.time,
      source: "Open-Meteo",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar el clima" },
      { status: 502 },
    );
  }
}
