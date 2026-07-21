export type Coordinate = [number, number];

type PointProperties = Record<string, string | number | null | undefined>;

export type PointFeature = {
  type: "Feature";
  properties: PointProperties;
  geometry: { type: "Point"; coordinates: Coordinate };
};

export type LineFeature = {
  type: "Feature";
  properties: PointProperties;
  geometry: { type: "LineString"; coordinates: Coordinate[] };
};

export type FeatureCollection<T> = {
  type: "FeatureCollection";
  features: T[];
};

export type TransitData = {
  telefericoStations: FeatureCollection<PointFeature>;
  telefericoLines: FeatureCollection<LineFeature>;
  pumakatariStops: FeatureCollection<PointFeature>;
  pumakatariRoutes: FeatureCollection<LineFeature>;
};

export type RouteMode = "walk" | "teleferico" | "pumakatari";

export type RouteStep = {
  mode: RouteMode;
  title: string;
  detail: string;
};

export type RouteSegment = {
  mode: RouteMode;
  color: string;
  coordinates: Coordinate[];
};

export type RouteOption = {
  id: RouteMode;
  label: string;
  summary: string;
  durationMinutes: number;
  distanceKm: number;
  steps: RouteStep[];
  segments: RouteSegment[];
};

export type RoutePlan = {
  recommendedId: RouteMode;
  options: RouteOption[];
};

type GraphEdge = {
  to: string;
  line: string;
  color: string;
  distanceKm: number;
};

type StationNode = {
  id: string;
  name: string;
  coordinate: Coordinate;
};

const WALKING_SPEED_KMH = 4.5;
const TELEFERICO_SPEED_KMH = 16;
const BUS_SPEED_KMH = 17;

const LINE_COLORS: Record<string, string> = {
  roja: "#e31a1c",
  amarilla: "#d7ab00",
  verde: "#299438",
  azul: "#0874c9",
  naranja: "#ef8b21",
  blanca: "#8d9499",
  celeste: "#2197c8",
  morada: "#843a9b",
  cafe: "#765c42",
  plateada: "#737b80",
};

const PUMAKATARI_COLORS: Record<string, string> = {
  "Caja Ferroviaria": "#d62828",
  Chasquipampa: "#277da1",
  "Inca Llojeta": "#7b2cbf",
  "Irpavi II (Norte)": "#008f5a",
  "Villa Salome": "#e07a00",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/estacion/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function distanceKm(a: Coordinate, b: Coordinate) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(b[1] - a[1]);
  const longitudeDelta = toRadians(b[0] - a[0]);
  const latitudeA = toRadians(a[1]);
  const latitudeB = toRadians(b[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function walkingMinutes(kilometers: number) {
  return (kilometers / WALKING_SPEED_KMH) * 60;
}

function roundedMinutes(minutes: number) {
  return Math.max(1, Math.round(minutes));
}

function lineColor(line: string) {
  const normalized = normalize(line);
  return (
    Object.entries(LINE_COLORS).find(([name]) => normalized.includes(name))?.[1] ??
    "#555555"
  );
}

function nearestCoordinateIndex(coordinates: Coordinate[], target: Coordinate) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  coordinates.forEach((coordinate, index) => {
    const distance = distanceKm(coordinate, target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function pathDistance(coordinates: Coordinate[]) {
  return coordinates.slice(1).reduce(
    (total, coordinate, index) => total + distanceKm(coordinates[index], coordinate),
    0,
  );
}

function createWalkingOption(origin: Coordinate, destination: Coordinate): RouteOption {
  const directDistance = distanceKm(origin, destination) * 1.25;
  return {
    id: "walk",
    label: "A pie",
    summary: `${directDistance.toFixed(1)} km estimados`,
    durationMinutes: roundedMinutes(walkingMinutes(directDistance)),
    distanceKm: directDistance,
    steps: [
      {
        mode: "walk",
        title: "Camina al restaurante",
        detail: `${directDistance.toFixed(1)} km aproximados`,
      },
    ],
    segments: [{ mode: "walk", color: "#211c18", coordinates: [origin, destination] }],
  };
}

function createTelefericoOption(
  origin: Coordinate,
  destination: Coordinate,
  stations: FeatureCollection<PointFeature>,
): RouteOption | null {
  const nodes = new Map<string, StationNode>();
  const graph = new Map<string, GraphEdge[]>();
  const stationsByLine = new Map<string, PointFeature[]>();

  stations.features.forEach((station) => {
    const name = String(station.properties.nombre ?? "Estacion");
    const id = normalize(name);
    const line = String(station.properties.estacion ?? "Linea").replace("Estacion", "Linea");
    if (!nodes.has(id)) {
      nodes.set(id, { id, name, coordinate: station.geometry.coordinates });
    }
    const lineStations = stationsByLine.get(line) ?? [];
    lineStations.push(station);
    stationsByLine.set(line, lineStations);
  });

  stationsByLine.forEach((lineStations, line) => {
    lineStations.slice(1).forEach((station, index) => {
      const previous = lineStations[index];
      const from = normalize(String(previous.properties.nombre));
      const to = normalize(String(station.properties.nombre));
      const edge = {
        line,
        color: lineColor(line),
        distanceKm: distanceKm(previous.geometry.coordinates, station.geometry.coordinates),
      };
      graph.set(from, [...(graph.get(from) ?? []), { ...edge, to }]);
      graph.set(to, [...(graph.get(to) ?? []), { ...edge, to: from }]);
    });
  });

  const rankedFromOrigin = [...nodes.values()].sort(
    (a, b) => distanceKm(origin, a.coordinate) - distanceKm(origin, b.coordinate),
  );
  const rankedFromDestination = [...nodes.values()].sort(
    (a, b) => distanceKm(destination, a.coordinate) - distanceKm(destination, b.coordinate),
  );
  const starts = rankedFromOrigin.slice(0, 4);
  const ends = rankedFromDestination.slice(0, 4);
  let best:
    | {
        start: StationNode;
        end: StationNode;
        edges: Array<GraphEdge & { from: string }>;
        score: number;
      }
    | undefined;

  starts.forEach((start) => {
    const distances = new Map<string, number>([[start.id, 0]]);
    const previous = new Map<string, { node: string; edge: GraphEdge }>();
    const unvisited = new Set(nodes.keys());

    while (unvisited.size > 0) {
      const current = [...unvisited].reduce<string | null>((closest, node) => {
        if (distances.get(node) === undefined) return closest;
        if (closest === null) return node;
        return (distances.get(node) ?? Infinity) < (distances.get(closest) ?? Infinity)
          ? node
          : closest;
      }, null);
      if (!current) break;
      unvisited.delete(current);
      (graph.get(current) ?? []).forEach((edge) => {
        const weight = (edge.distanceKm / TELEFERICO_SPEED_KMH) * 60 + 2;
        const nextDistance = (distances.get(current) ?? 0) + weight;
        if (nextDistance < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, nextDistance);
          previous.set(edge.to, { node: current, edge });
        }
      });
    }

    ends.forEach((end) => {
      const networkMinutes = distances.get(end.id);
      if (networkMinutes === undefined || start.id === end.id) return;
      const accessStart = distanceKm(origin, start.coordinate) * 1.2;
      const accessEnd = distanceKm(end.coordinate, destination) * 1.2;
      if (accessStart > 1.8 || accessEnd > 1.8) return;
      const score = walkingMinutes(accessStart + accessEnd) + networkMinutes + 4;
      if (best && best.score <= score) return;

      const edges: Array<GraphEdge & { from: string }> = [];
      let cursor = end.id;
      while (cursor !== start.id) {
        const step = previous.get(cursor);
        if (!step) return;
        edges.unshift({ ...step.edge, from: step.node });
        cursor = step.node;
      }
      best = { start, end, edges, score };
    });
  });

  if (!best) return null;
  const chosen = best as NonNullable<typeof best>;
  const groupedLines: Array<{
    line: string;
    color: string;
    coordinates: Coordinate[];
    endId: string;
  }> = [];
  chosen.edges.forEach((edge) => {
    const from = nodes.get(edge.from)?.coordinate;
    const to = nodes.get(edge.to)?.coordinate;
    if (!from || !to) return;
    const current = groupedLines.at(-1);
    if (current?.line === edge.line) {
      current.coordinates.push(to);
      current.endId = edge.to;
    } else {
      groupedLines.push({
        line: edge.line,
        color: edge.color,
        coordinates: [from, to],
        endId: edge.to,
      });
    }
  });
  const accessStartKm = distanceKm(origin, chosen.start.coordinate) * 1.2;
  const accessEndKm = distanceKm(chosen.end.coordinate, destination) * 1.2;
  const networkKm = chosen.edges.reduce((total, edge) => total + edge.distanceKm, 0);
  const steps: RouteStep[] = [
    {
      mode: "walk",
      title: `Camina a ${chosen.start.name}`,
      detail: `${accessStartKm.toFixed(1)} km`,
    },
    ...groupedLines.map((group, index) => ({
      mode: "teleferico" as const,
      title: `Toma ${group.line}`,
      detail:
        index < groupedLines.length - 1
          ? `Cambia en ${nodes.get(group.endId)?.name ?? "la estacion indicada"}`
          : `Baja en ${chosen.end.name}`,
    })),
    {
      mode: "walk",
      title: "Camina al restaurante",
      detail: `${accessEndKm.toFixed(1)} km`,
    },
  ];

  return {
    id: "teleferico",
    label: "Teleferico",
    summary: `${groupedLines.length} ${groupedLines.length === 1 ? "linea" : "lineas"}`,
    durationMinutes: roundedMinutes(chosen.score),
    distanceKm: accessStartKm + networkKm + accessEndKm,
    steps,
    segments: [
      { mode: "walk", color: "#211c18", coordinates: [origin, chosen.start.coordinate] },
      ...groupedLines.map((group) => ({
        mode: "teleferico" as const,
        color: group.color,
        coordinates: group.coordinates,
      })),
      { mode: "walk", color: "#211c18", coordinates: [chosen.end.coordinate, destination] },
    ],
  };
}

function createPumakatariOption(
  origin: Coordinate,
  destination: Coordinate,
  stops: FeatureCollection<PointFeature>,
  routes: FeatureCollection<LineFeature>,
): RouteOption | null {
  let best:
    | {
        corridor: string;
        route: LineFeature;
        startStop: PointFeature;
        endStop: PointFeature;
        coordinates: Coordinate[];
        accessStartKm: number;
        accessEndKm: number;
        networkKm: number;
        score: number;
      }
    | undefined;

  routes.features.forEach((route) => {
    const corridor = String(route.properties.corridor ?? "");
    if (!corridor) return;
    const corridorStops = stops.features.filter(
      (stop) => String(stop.properties.corridor ?? "") === corridor,
    );
    if (corridorStops.length < 2 || route.geometry.coordinates.length < 2) return;
    const startStop = corridorStops.reduce((closest, stop) =>
      distanceKm(origin, stop.geometry.coordinates) < distanceKm(origin, closest.geometry.coordinates)
        ? stop
        : closest,
    );
    const endStop = corridorStops.reduce((closest, stop) =>
      distanceKm(destination, stop.geometry.coordinates) <
      distanceKm(destination, closest.geometry.coordinates)
        ? stop
        : closest,
    );
    const accessStartKm = distanceKm(origin, startStop.geometry.coordinates) * 1.2;
    const accessEndKm = distanceKm(endStop.geometry.coordinates, destination) * 1.2;
    if (accessStartKm > 1.4 || accessEndKm > 1.4) return;

    const startIndex = nearestCoordinateIndex(route.geometry.coordinates, startStop.geometry.coordinates);
    const endIndex = nearestCoordinateIndex(route.geometry.coordinates, endStop.geometry.coordinates);
    if (startIndex === endIndex) return;
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    let coordinates = route.geometry.coordinates.slice(from, to + 1);
    if (startIndex > endIndex) coordinates = coordinates.reverse();
    const networkKm = pathDistance(coordinates);
    const score =
      walkingMinutes(accessStartKm + accessEndKm) +
      (networkKm / BUS_SPEED_KMH) * 60 +
      7;
    if (!best || score < best.score) {
      best = {
        corridor,
        route,
        startStop,
        endStop,
        coordinates,
        accessStartKm,
        accessEndKm,
        networkKm,
        score,
      };
    }
  });

  if (!best) return null;
  const chosen = best as NonNullable<typeof best>;
  const startName = String(chosen.startStop.properties.direccion ?? "la parada indicada");
  const endName = String(chosen.endStop.properties.direccion ?? "la parada indicada");
  return {
    id: "pumakatari",
    label: "PumaKatari",
    summary: chosen.corridor,
    durationMinutes: roundedMinutes(chosen.score),
    distanceKm: chosen.accessStartKm + chosen.networkKm + chosen.accessEndKm,
    steps: [
      {
        mode: "walk",
        title: `Camina a ${startName}`,
        detail: `${chosen.accessStartKm.toFixed(1)} km`,
      },
      {
        mode: "pumakatari",
        title: `Toma ${chosen.corridor}`,
        detail: `Baja en ${endName}`,
      },
      {
        mode: "walk",
        title: "Camina al restaurante",
        detail: `${chosen.accessEndKm.toFixed(1)} km`,
      },
    ],
    segments: [
      { mode: "walk", color: "#211c18", coordinates: [origin, chosen.startStop.geometry.coordinates] },
      {
        mode: "pumakatari",
        color: PUMAKATARI_COLORS[chosen.corridor] ?? "#277da1",
        coordinates: chosen.coordinates,
      },
      { mode: "walk", color: "#211c18", coordinates: [chosen.endStop.geometry.coordinates, destination] },
    ],
  };
}

export function planRestaurantRoute(
  origin: Coordinate,
  destination: Coordinate,
  transit: TransitData,
): RoutePlan {
  const options = [
    createWalkingOption(origin, destination),
    createTelefericoOption(origin, destination, transit.telefericoStations),
    createPumakatariOption(
      origin,
      destination,
      transit.pumakatariStops,
      transit.pumakatariRoutes,
    ),
  ].filter((option): option is RouteOption => option !== null);
  const recommended = options.reduce((best, option) =>
    option.durationMinutes < best.durationMinutes ? option : best,
  );
  return { recommendedId: recommended.id, options };
}
