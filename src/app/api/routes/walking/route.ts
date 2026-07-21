import { NextResponse } from "next/server";

type Coordinate = [number, number];

type WalkingPair = {
  id: string;
  from: Coordinate;
  to: Coordinate;
};

type StreetRoute = {
  id: string;
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
};

type CacheEntry = {
  route: Omit<StreetRoute, "id">;
  expiresAt: number;
};

type ValhallaResponse = {
  trip?: {
    summary?: { length?: number; time?: number };
    legs?: Array<{ shape?: string }>;
  };
  error?: string;
};

type ValhallaMatrixResponse = {
  sources_to_targets?: {
    durations?: Array<Array<number | null>>;
    distances?: Array<Array<number | null>>;
  };
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const metricCache = new Map<string, CacheEntry>();
const shapeCache = new Map<string, CacheEntry>();

function isCoordinate(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part)) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function coordinateKey(coordinate: Coordinate) {
  return `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`;
}

function pairKey(pair: WalkingPair) {
  return `${coordinateKey(pair.from)}:${coordinateKey(pair.to)}`;
}

function cachedRoute(
  cache: Map<string, CacheEntry>,
  pair: WalkingPair,
  allowStale = false,
): StreetRoute | null {
  const entry = cache.get(pairKey(pair));
  if (!entry || (!allowStale && entry.expiresAt < Date.now())) return null;
  return { id: pair.id, ...entry.route };
}

function storeRoute(cache: Map<string, CacheEntry>, pair: WalkingPair, route: StreetRoute) {
  cache.set(pairKey(pair), {
    route: {
      coordinates: route.coordinates,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
    },
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function decodePolyline6(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  const decodeValue = () => {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index <= encoded.length);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    latitude += decodeValue();
    longitude += decodeValue();
    coordinates.push([longitude / 1e6, latitude / 1e6]);
  }
  return coordinates;
}

function valhallaLocation(coordinate: Coordinate) {
  return {
    lon: coordinate[0],
    lat: coordinate[1],
    radius: 100,
    minimum_reachability: 5,
  };
}

async function requestValhalla<T>(path: string, payload: object): Promise<T> {
  const baseUrl = process.env.VALHALLA_URL ?? "https://valhalla1.openstreetmap.de";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const url = new URL(path, baseUrl);
      url.searchParams.set("json", JSON.stringify(payload));
      const response = await fetch(url, {
        headers: {
          "X-Client-Id": process.env.VALHALLA_CLIENT_ID ?? "ubifood.vercel.app",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Valhalla HTTP ${response.status}`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Valhalla no disponible");
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  throw lastError ?? new Error("Valhalla no disponible");
}

async function routeWalkingPair(pair: WalkingPair) {
  const cached = cachedRoute(shapeCache, pair);
  if (cached) return cached;

  try {
    const data = await requestValhalla<ValhallaResponse>("/route", {
      locations: [valhallaLocation(pair.from), valhallaLocation(pair.to)],
      costing: "pedestrian",
      units: "kilometers",
      shape_format: "polyline6",
      directions_options: { units: "kilometers" },
    });
    const shape = data.trip?.legs?.[0]?.shape;
    const distanceKm = data.trip?.summary?.length;
    const durationSeconds = data.trip?.summary?.time;
    if (!shape || distanceKm === undefined || durationSeconds === undefined) {
      throw new Error(data.error ?? "Ruta peatonal incompleta");
    }
    const coordinates = decodePolyline6(shape);
    if (coordinates.length < 2) throw new Error("Ruta peatonal sin geometria");
    const route = {
      id: pair.id,
      coordinates,
      distanceKm,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
    };
    storeRoute(shapeCache, pair, route);
    return route;
  } catch (error) {
    const stale = cachedRoute(shapeCache, pair, true);
    if (stale) return stale;
    throw error;
  }
}

async function routeWalkingMatrix(pairs: WalkingPair[]) {
  const missing = pairs.filter((pair) => !cachedRoute(metricCache, pair));
  if (missing.length > 0) {
    const sources = [...new Map(missing.map((pair) => [coordinateKey(pair.from), pair.from])).values()];
    const targets = [...new Map(missing.map((pair) => [coordinateKey(pair.to), pair.to])).values()];
    const sourceIndexes = new Map(sources.map((coordinate, index) => [coordinateKey(coordinate), index]));
    const targetIndexes = new Map(targets.map((coordinate, index) => [coordinateKey(coordinate), index]));

    try {
      const data = await requestValhalla<ValhallaMatrixResponse>("/sources_to_targets", {
        sources: sources.map(valhallaLocation),
        targets: targets.map(valhallaLocation),
        costing: "pedestrian",
        units: "kilometers",
        verbose: false,
      });
      const durations = data.sources_to_targets?.durations;
      const distances = data.sources_to_targets?.distances;
      missing.forEach((pair) => {
        const sourceIndex = sourceIndexes.get(coordinateKey(pair.from));
        const targetIndex = targetIndexes.get(coordinateKey(pair.to));
        if (sourceIndex === undefined || targetIndex === undefined) return;
        const durationSeconds = durations?.[sourceIndex]?.[targetIndex];
        const distanceKm = distances?.[sourceIndex]?.[targetIndex];
        if (durationSeconds === null || distanceKm === null) return;
        if (durationSeconds === undefined || distanceKm === undefined) return;
        storeRoute(metricCache, pair, {
          id: pair.id,
          coordinates: [pair.from, pair.to],
          distanceKm,
          durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
        });
      });
    } catch {
      // Stale matrix values are still useful during a brief demo-server outage.
    }
  }

  return pairs.flatMap((pair) => {
    const route = cachedRoute(metricCache, pair, true);
    return route ? [route] : [];
  });
}

async function routeWithLimitedConcurrency(pairs: WalkingPair[]) {
  const routes: StreetRoute[] = [];
  for (let index = 0; index < pairs.length; index += 3) {
    const batch = await Promise.allSettled(pairs.slice(index, index + 3).map(routeWalkingPair));
    batch.forEach((result) => {
      if (result.status === "fulfilled") routes.push(result.value);
    });
  }
  return routes;
}

export async function POST(request: Request) {
  let body: { pairs?: WalkingPair[]; metricsOnly?: boolean };
  try {
    body = (await request.json()) as { pairs?: WalkingPair[]; metricsOnly?: boolean };
  } catch {
    return NextResponse.json({ error: "Solicitud invalida" }, { status: 400 });
  }

  const pairs = body.pairs;
  if (
    !Array.isArray(pairs) ||
    pairs.length === 0 ||
    pairs.length > 24 ||
    pairs.some(
      (pair) =>
        !pair ||
        typeof pair.id !== "string" ||
        pair.id.length > 100 ||
        !isCoordinate(pair.from) ||
        !isCoordinate(pair.to),
    )
  ) {
    return NextResponse.json({ error: "Tramos peatonales invalidos" }, { status: 400 });
  }

  const routes = body.metricsOnly
    ? await routeWalkingMatrix(pairs)
    : await routeWithLimitedConcurrency(pairs);
  if (routes.length === 0) {
    return NextResponse.json(
      { error: "No se pudieron calcular caminos peatonales" },
      { status: 502 },
    );
  }
  return NextResponse.json({ routes, partial: routes.length !== pairs.length });
}
