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
  distanceKm: number;
  durationMinutes: number;
  routing?: "street" | "station-connector";
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

export type WalkingRouteMetric = {
  distanceKm: number;
  durationMinutes: number;
};

export type WalkingRouteLookup = (
  from: Coordinate,
  to: Coordinate,
) => WalkingRouteMetric | undefined;

type GraphEdge = {
  to: string;
  line: string;
  color: string;
  distanceKm: number;
  kind: "ride" | "transfer";
};

type StationNode = {
  id: string;
  name: string;
  line: string;
  coordinate: Coordinate;
  accessCoordinate: Coordinate;
};

const WALKING_SPEED_KMH = 4.5;
const TELEFERICO_SPEED_KMH = 16;
const BUS_SPEED_KMH = 17;
const WALKING_PRIORITY_MULTIPLIER = 3;

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

const TELEFERICO_PEDESTRIAN_ACCESS: Record<string, Coordinate> = {
  "celeste|teatro al aire libre": [-68.12657, -16.50348],
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

export function telefericoPedestrianCoordinate(
  station: PointFeature,
): Coordinate {
  const line = normalize(String(station.properties.estacion ?? ""));
  const name = normalize(String(station.properties.nombre ?? ""));
  return TELEFERICO_PEDESTRIAN_ACCESS[`${line}|${name}`] ??
    station.geometry.coordinates;
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

function walkingMetric(
  from: Coordinate,
  to: Coordinate,
  lookup?: WalkingRouteLookup,
): WalkingRouteMetric {
  const resolved = lookup?.(from, to);
  if (resolved) return resolved;
  const estimatedDistance = distanceKm(from, to) * 1.2;
  return {
    distanceKm: estimatedDistance,
    durationMinutes: roundedMinutes(walkingMinutes(estimatedDistance)),
  };
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

function createWalkingOption(
  origin: Coordinate,
  destination: Coordinate,
  walkingLookup?: WalkingRouteLookup,
): RouteOption {
  const directMetric = walkingMetric(origin, destination, walkingLookup);
  const directDistance = directMetric.distanceKm;
  return {
    id: "walk",
    label: "A pie",
    summary: `${directDistance.toFixed(1)} km estimados`,
    durationMinutes: directMetric.durationMinutes,
    distanceKm: directDistance,
    steps: [
      {
        mode: "walk",
        title: "Camina al restaurante",
        detail: `${directDistance.toFixed(1)} km aproximados`,
      },
    ],
    segments: [
      {
        mode: "walk",
        color: "#211c18",
        coordinates: [origin, destination],
        distanceKm: directDistance,
        durationMinutes: directMetric.durationMinutes,
      },
    ],
  };
}

function createTelefericoOption(
  origin: Coordinate,
  destination: Coordinate,
  stations: FeatureCollection<PointFeature>,
  walkingLookup?: WalkingRouteLookup,
): RouteOption | null {
  const nodes = new Map<string, StationNode>();
  const graph = new Map<string, GraphEdge[]>();
  const stationsByLine = new Map<string, StationNode[]>();

  stations.features.forEach((station, index) => {
    const name = String(station.properties.nombre ?? "Estacion");
    const line = String(station.properties.estacion ?? "Linea").replace("Estacion", "Linea");
    const id = `${normalize(line)}-${index}`;
    const node = {
      id,
      name,
      line,
      coordinate: station.geometry.coordinates,
      accessCoordinate: telefericoPedestrianCoordinate(station),
    };
    nodes.set(id, node);
    const lineStations = stationsByLine.get(line) ?? [];
    lineStations.push(node);
    stationsByLine.set(line, lineStations);
  });

  stationsByLine.forEach((lineStations, line) => {
    lineStations.slice(1).forEach((node, index) => {
      const previous = lineStations[index];
      const edge = {
        line,
        color: lineColor(line),
        distanceKm: distanceKm(previous.coordinate, node.coordinate),
        kind: "ride" as const,
      };
      graph.set(previous.id, [...(graph.get(previous.id) ?? []), { ...edge, to: node.id }]);
      graph.set(node.id, [...(graph.get(node.id) ?? []), { ...edge, to: previous.id }]);
    });
  });

  const stationNodes = [...nodes.values()];
  stationNodes.forEach((station, index) => {
    stationNodes.slice(index + 1).forEach((candidate) => {
      if (station.line === candidate.line) return;
      const transferDistance = distanceKm(station.coordinate, candidate.coordinate);
      if (transferDistance > 0.35) return;
      const edge = {
        line: candidate.line,
        color: "#211c18",
        distanceKm: transferDistance * 1.2,
        kind: "transfer" as const,
      };
      graph.set(station.id, [
        ...(graph.get(station.id) ?? []),
        { ...edge, to: candidate.id },
      ]);
      graph.set(candidate.id, [
        ...(graph.get(candidate.id) ?? []),
        { ...edge, to: station.id, line: station.line },
      ]);
    });
  });

  const rankedFromOrigin = stationNodes.sort(
    (a, b) =>
      walkingMetric(origin, a.accessCoordinate, walkingLookup).distanceKm -
      walkingMetric(origin, b.accessCoordinate, walkingLookup).distanceKm,
  );
  const rankedFromDestination = [...stationNodes].sort(
    (a, b) =>
      walkingMetric(a.accessCoordinate, destination, walkingLookup).distanceKm -
      walkingMetric(b.accessCoordinate, destination, walkingLookup).distanceKm,
  );
  const closestStart = rankedFromOrigin[0];
  const closestEnd = rankedFromDestination[0];
  const starts = rankedFromOrigin
    .filter(
      (station) =>
        station.id === closestStart.id ||
        distanceKm(station.coordinate, closestStart.coordinate) <= 0.2,
    )
    .slice(0, 6);
  const ends = rankedFromDestination
    .filter(
      (station) =>
        station.id === closestEnd.id ||
        distanceKm(station.coordinate, closestEnd.coordinate) <= 0.2,
    )
    .slice(0, 6);
  let best:
    | {
        start: StationNode;
        end: StationNode;
        edges: Array<GraphEdge & { from: string }>;
        score: number;
        accessStart: WalkingRouteMetric;
        accessEnd: WalkingRouteMetric;
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
        const weight = edge.kind === "transfer"
          ? walkingMinutes(edge.distanceKm) * WALKING_PRIORITY_MULTIPLIER + 3
          : (edge.distanceKm / TELEFERICO_SPEED_KMH) * 60 + 2;
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
      const accessStart = walkingMetric(origin, start.accessCoordinate, walkingLookup);
      const accessEnd = walkingMetric(end.accessCoordinate, destination, walkingLookup);
      if (accessStart.distanceKm > 2.5 || accessEnd.distanceKm > 2.5) return;
      const score =
        (accessStart.durationMinutes + accessEnd.durationMinutes) *
          WALKING_PRIORITY_MULTIPLIER +
        networkMinutes +
        4;
      if (best && best.score <= score) return;

      const edges: Array<GraphEdge & { from: string }> = [];
      let cursor = end.id;
      while (cursor !== start.id) {
        const step = previous.get(cursor);
        if (!step) return;
        edges.unshift({ ...step.edge, from: step.node });
        cursor = step.node;
      }
      best = { start, end, edges, score, accessStart, accessEnd };
    });
  });

  if (!best) return null;
  const chosen = best as NonNullable<typeof best>;
  type RoutePiece =
    | {
        kind: "ride";
        line: string;
        color: string;
        coordinates: Coordinate[];
        endId: string;
      }
    | {
        kind: "transfer";
        line: string;
        coordinates: Coordinate[];
        endId: string;
        distanceKm: number;
      };
  const routePieces: RoutePiece[] = [];
  chosen.edges.forEach((edge) => {
    const from = nodes.get(edge.from)?.coordinate;
    const to = nodes.get(edge.to)?.coordinate;
    if (!from || !to) return;
    if (edge.kind === "transfer") {
      routePieces.push({
        kind: "transfer",
        line: nodes.get(edge.to)?.line ?? edge.line,
        coordinates: [from, to],
        endId: edge.to,
        distanceKm: edge.distanceKm,
      });
      return;
    }
    const current = routePieces.at(-1);
    if (current?.kind === "ride" && current.line === edge.line) {
      current.coordinates.push(to);
      current.endId = edge.to;
    } else {
      routePieces.push({
        kind: "ride",
        line: edge.line,
        color: edge.color,
        coordinates: [from, to],
        endId: edge.to,
      });
    }
  });
  const accessStartKm = chosen.accessStart.distanceKm;
  const accessEndKm = chosen.accessEnd.distanceKm;
  const startConnectorKm = distanceKm(
    chosen.start.accessCoordinate,
    chosen.start.coordinate,
  );
  const endConnectorKm = distanceKm(
    chosen.end.coordinate,
    chosen.end.accessCoordinate,
  );
  const hasStartConnector = startConnectorKm > 0.025;
  const hasEndConnector = endConnectorKm > 0.025;
  const connectorKm =
    (hasStartConnector ? startConnectorKm : 0) +
    (hasEndConnector ? endConnectorKm : 0);
  const networkKm = chosen.edges.reduce((total, edge) => total + edge.distanceKm, 0);
  const networkDurationMinutes = chosen.edges.reduce(
    (total, edge) =>
      total +
      (edge.kind === "transfer"
        ? walkingMinutes(edge.distanceKm) + 3
        : (edge.distanceKm / TELEFERICO_SPEED_KMH) * 60 + 2),
    0,
  );
  const actualDurationMinutes =
    chosen.accessStart.durationMinutes +
    chosen.accessEnd.durationMinutes +
    networkDurationMinutes +
    walkingMinutes(connectorKm) +
    4;
  const ridePieces = routePieces.filter((piece) => piece.kind === "ride");
  const steps: RouteStep[] = [
    {
      mode: "walk",
      title: `Camina a ${chosen.start.name}`,
      detail: `${accessStartKm.toFixed(1)} km`,
    },
    ...(hasStartConnector
      ? [
          {
            mode: "walk" as const,
            title: `Ingresa a ${chosen.start.name}`,
            detail: "Acceso peatonal a la estacion",
          },
        ]
      : []),
    ...routePieces.map((piece) =>
      piece.kind === "ride"
        ? {
            mode: "teleferico" as const,
            title: `Toma ${piece.line}`,
            detail: `Baja en ${nodes.get(piece.endId)?.name ?? "la estacion indicada"}`,
          }
        : {
            mode: "walk" as const,
            title: `Conecta con ${piece.line}`,
            detail: `${piece.distanceKm.toFixed(1)} km entre estaciones`,
          },
    ),
    ...(hasEndConnector
      ? [
          {
            mode: "walk" as const,
            title: `Sal de ${chosen.end.name}`,
            detail: "Salida peatonal de la estacion",
          },
        ]
      : []),
    {
      mode: "walk",
      title: "Camina al restaurante",
      detail: `${accessEndKm.toFixed(1)} km`,
    },
  ];

  return {
    id: "teleferico",
    label: "Teleferico",
    summary: `${ridePieces.length} ${ridePieces.length === 1 ? "linea" : "lineas"}`,
    durationMinutes: roundedMinutes(actualDurationMinutes),
    distanceKm: accessStartKm + connectorKm + networkKm + accessEndKm,
    steps,
    segments: [
      {
        mode: "walk",
        color: "#211c18",
        coordinates: [origin, chosen.start.accessCoordinate],
        distanceKm: accessStartKm,
        durationMinutes: chosen.accessStart.durationMinutes,
      },
      ...(hasStartConnector
        ? [
            {
              mode: "walk" as const,
              color: "#211c18",
              coordinates: [chosen.start.accessCoordinate, chosen.start.coordinate],
              distanceKm: startConnectorKm,
              durationMinutes: roundedMinutes(walkingMinutes(startConnectorKm)),
              routing: "station-connector" as const,
            },
          ]
        : []),
      ...routePieces.map((piece): RouteSegment => {
        if (piece.kind === "transfer") {
          return {
            mode: "walk",
            color: "#211c18",
            coordinates: piece.coordinates,
            distanceKm: piece.distanceKm,
            durationMinutes: roundedMinutes(walkingMinutes(piece.distanceKm) + 3),
          };
        }
        const groupDistance = pathDistance(piece.coordinates);
        return {
          mode: "teleferico",
          color: piece.color,
          coordinates: piece.coordinates,
          distanceKm: groupDistance,
          durationMinutes: roundedMinutes(
            (groupDistance / TELEFERICO_SPEED_KMH) * 60 +
              Math.max(1, piece.coordinates.length - 1) * 2,
          ),
        };
      }),
      ...(hasEndConnector
        ? [
            {
              mode: "walk" as const,
              color: "#211c18",
              coordinates: [chosen.end.coordinate, chosen.end.accessCoordinate],
              distanceKm: endConnectorKm,
              durationMinutes: roundedMinutes(walkingMinutes(endConnectorKm)),
              routing: "station-connector" as const,
            },
          ]
        : []),
      {
        mode: "walk",
        color: "#211c18",
        coordinates: [chosen.end.accessCoordinate, destination],
        distanceKm: accessEndKm,
        durationMinutes: chosen.accessEnd.durationMinutes,
      },
    ],
  };
}

function createPumakatariOption(
  origin: Coordinate,
  destination: Coordinate,
  stops: FeatureCollection<PointFeature>,
  routes: FeatureCollection<LineFeature>,
  walkingLookup?: WalkingRouteLookup,
): RouteOption | null {
  type BusNode = {
    id: string;
    name: string;
    corridor: string;
    routeName: string;
    coordinate: Coordinate;
    routeIndex: number;
  };
  type BusEdge = {
    to: string;
    kind: "ride" | "transfer";
    corridor: string;
    routeName: string;
    color: string;
    coordinates: Coordinate[];
    distanceKm: number;
    durationMinutes: number;
  };

  const routeByName = new Map(
    routes.features.map((route) => [String(route.properties.ruta ?? ""), route]),
  );
  const nodes = new Map<string, BusNode>();
  const graph = new Map<string, BusEdge[]>();
  const nodesByRoute = new Map<string, BusNode[]>();

  stops.features.forEach((stop, index) => {
    const routeName = String(stop.properties.ruta ?? "");
    const route = routeByName.get(routeName);
    if (!route || route.geometry.coordinates.length < 2) return;
    const corridor = String(stop.properties.corridor ?? "PumaKatari");
    const node: BusNode = {
      id: `pumakatari-${index}`,
      name: String(stop.properties.direccion ?? "Parada PumaKatari"),
      corridor,
      routeName,
      coordinate: stop.geometry.coordinates,
      routeIndex: nearestCoordinateIndex(
        route.geometry.coordinates,
        stop.geometry.coordinates,
      ),
    };
    nodes.set(node.id, node);
    nodesByRoute.set(routeName, [...(nodesByRoute.get(routeName) ?? []), node]);
  });

  nodesByRoute.forEach((routeNodes, routeName) => {
    const route = routeByName.get(routeName);
    if (!route) return;
    const ordered = [...routeNodes].sort((a, b) => a.routeIndex - b.routeIndex);
    ordered.slice(1).forEach((node, index) => {
      const previous = ordered[index];
      if (previous.routeIndex === node.routeIndex) return;
      const routeCoordinates = route.geometry.coordinates.slice(
        previous.routeIndex,
        node.routeIndex + 1,
      );
      const coordinates = [
        previous.coordinate,
        ...routeCoordinates,
        node.coordinate,
      ];
      const networkDistance = pathDistance(coordinates);
      const edge: BusEdge = {
        to: node.id,
        kind: "ride",
        corridor: node.corridor,
        routeName,
        color: PUMAKATARI_COLORS[node.corridor] ?? "#277da1",
        coordinates,
        distanceKm: networkDistance,
        durationMinutes: (networkDistance / BUS_SPEED_KMH) * 60 + 0.6,
      };
      graph.set(previous.id, [...(graph.get(previous.id) ?? []), edge]);
      graph.set(node.id, [
        ...(graph.get(node.id) ?? []),
        {
          ...edge,
          to: previous.id,
          coordinates: [...coordinates].reverse(),
        },
      ]);
    });
  });

  const stationNodes = [...nodes.values()];
  stationNodes.forEach((node) => {
    const nearestByRoute = new Map<
      string,
      { candidate: BusNode; distanceKm: number }
    >();
    stationNodes.forEach((candidate) => {
      if (node.routeName === candidate.routeName) return;
      const transferDistance = distanceKm(node.coordinate, candidate.coordinate);
      if (transferDistance > 0.65) return;
      const current = nearestByRoute.get(candidate.routeName);
      if (!current || transferDistance < current.distanceKm) {
        nearestByRoute.set(candidate.routeName, {
          candidate,
          distanceKm: transferDistance,
        });
      }
    });
    nearestByRoute.forEach(({ candidate, distanceKm: transferDistance }) => {
      const transfer: BusEdge = {
        to: candidate.id,
        kind: "transfer",
        corridor: candidate.corridor,
        routeName: candidate.routeName,
        color: "#211c18",
        coordinates: [node.coordinate, candidate.coordinate],
        distanceKm: transferDistance * 1.2,
        durationMinutes: walkingMinutes(transferDistance * 1.2) + 3,
      };
      graph.set(node.id, [...(graph.get(node.id) ?? []), transfer]);
    });
  });

  if (stationNodes.length < 2) return null;
  const rankedFromOrigin = [...stationNodes].sort(
    (a, b) =>
      walkingMetric(origin, a.coordinate, walkingLookup).distanceKm -
      walkingMetric(origin, b.coordinate, walkingLookup).distanceKm,
  );
  const rankedFromDestination = [...stationNodes].sort(
    (a, b) =>
      walkingMetric(a.coordinate, destination, walkingLookup).distanceKm -
      walkingMetric(b.coordinate, destination, walkingLookup).distanceKm,
  );
  const closestStart = rankedFromOrigin[0];
  const closestEnd = rankedFromDestination[0];
  const starts = rankedFromOrigin
    .filter(
      (node) =>
        node.id === closestStart.id ||
        distanceKm(node.coordinate, closestStart.coordinate) <= 0.14,
    )
    .slice(0, 8);
  const ends = rankedFromDestination
    .filter(
      (node) =>
        node.id === closestEnd.id ||
        distanceKm(node.coordinate, closestEnd.coordinate) <= 0.14,
    )
    .slice(0, 8);
  let best:
    | {
        start: BusNode;
        end: BusNode;
        edges: Array<BusEdge & { from: string }>;
        accessStart: WalkingRouteMetric;
        accessEnd: WalkingRouteMetric;
        score: number;
      }
    | undefined;

  starts.forEach((start) => {
    const distances = new Map<string, number>([[start.id, 0]]);
    const previous = new Map<string, { node: string; edge: BusEdge }>();
    const unvisited = new Set(nodes.keys());

    while (unvisited.size > 0) {
      const current = [...unvisited].reduce<string | null>((closest, nodeId) => {
        if (distances.get(nodeId) === undefined) return closest;
        if (closest === null) return nodeId;
        return (distances.get(nodeId) ?? Infinity) <
          (distances.get(closest) ?? Infinity)
          ? nodeId
          : closest;
      }, null);
      if (!current) break;
      unvisited.delete(current);
      (graph.get(current) ?? []).forEach((edge) => {
        const weight = edge.kind === "transfer"
          ? edge.durationMinutes * WALKING_PRIORITY_MULTIPLIER
          : edge.durationMinutes;
        const nextDistance = (distances.get(current) ?? 0) + weight;
        if (nextDistance < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, nextDistance);
          previous.set(edge.to, { node: current, edge });
        }
      });
    }

    ends.forEach((end) => {
      const networkScore = distances.get(end.id);
      if (networkScore === undefined || start.id === end.id) return;
      const accessStart = walkingMetric(origin, start.coordinate, walkingLookup);
      const accessEnd = walkingMetric(end.coordinate, destination, walkingLookup);
      if (accessStart.distanceKm > 2.5 || accessEnd.distanceKm > 2.5) return;
      const score =
        (accessStart.durationMinutes + accessEnd.durationMinutes) *
          WALKING_PRIORITY_MULTIPLIER +
        networkScore +
        4;
      if (best && best.score <= score) return;

      const edges: Array<BusEdge & { from: string }> = [];
      let cursor = end.id;
      while (cursor !== start.id) {
        const step = previous.get(cursor);
        if (!step) return;
        edges.unshift({ ...step.edge, from: step.node });
        cursor = step.node;
      }
      best = { start, end, edges, accessStart, accessEnd, score };
    });
  });

  if (!best) return null;
  const chosen = best as NonNullable<typeof best>;
  type BusPiece = {
    kind: "ride" | "transfer";
    corridor: string;
    routeName: string;
    color: string;
    coordinates: Coordinate[];
    distanceKm: number;
    durationMinutes: number;
    endId: string;
  };
  const pieces: BusPiece[] = [];
  chosen.edges.forEach((edge) => {
    const current = pieces.at(-1);
    if (
      edge.kind === "ride" &&
      current?.kind === "ride" &&
      current.routeName === edge.routeName
    ) {
      current.coordinates.push(...edge.coordinates.slice(1));
      current.distanceKm += edge.distanceKm;
      current.durationMinutes += edge.durationMinutes;
      current.endId = edge.to;
      return;
    }
    pieces.push({
      kind: edge.kind,
      corridor: edge.corridor,
      routeName: edge.routeName,
      color: edge.color,
      coordinates: edge.coordinates,
      distanceKm: edge.distanceKm,
      durationMinutes: edge.durationMinutes,
      endId: edge.to,
    });
  });
  const ridePieces = pieces.filter((piece) => piece.kind === "ride");
  const networkKm = pieces.reduce((total, piece) => total + piece.distanceKm, 0);
  const networkMinutes = pieces.reduce(
    (total, piece) => total + piece.durationMinutes,
    0,
  );
  const durationMinutes =
    chosen.accessStart.durationMinutes +
    chosen.accessEnd.durationMinutes +
    networkMinutes +
    4;
  return {
    id: "pumakatari",
    label: "PumaKatari",
    summary: `${ridePieces.length} ${ridePieces.length === 1 ? "ruta" : "rutas"}`,
    durationMinutes: roundedMinutes(durationMinutes),
    distanceKm: chosen.accessStart.distanceKm + networkKm + chosen.accessEnd.distanceKm,
    steps: [
      {
        mode: "walk",
        title: `Camina a ${chosen.start.name}`,
        detail: `${chosen.accessStart.distanceKm.toFixed(1)} km`,
      },
      ...pieces.map((piece) =>
        piece.kind === "ride"
          ? {
              mode: "pumakatari" as const,
              title: `Toma ${piece.corridor}`,
              detail: `Baja en ${nodes.get(piece.endId)?.name ?? "la parada indicada"}`,
            }
          : {
              mode: "walk" as const,
              title: `Transborda a ${piece.corridor}`,
              detail: `${piece.distanceKm.toFixed(1)} km entre paradas`,
            },
      ),
      {
        mode: "walk",
        title: "Camina al restaurante",
        detail: `${chosen.accessEnd.distanceKm.toFixed(1)} km`,
      },
    ],
    segments: [
      {
        mode: "walk",
        color: "#211c18",
        coordinates: [origin, chosen.start.coordinate],
        distanceKm: chosen.accessStart.distanceKm,
        durationMinutes: chosen.accessStart.durationMinutes,
      },
      ...pieces.map((piece): RouteSegment => ({
        mode: piece.kind === "ride" ? "pumakatari" : "walk",
        color: piece.color,
        coordinates: piece.coordinates,
        distanceKm: piece.distanceKm,
        durationMinutes: roundedMinutes(piece.durationMinutes),
      })),
      {
        mode: "walk",
        color: "#211c18",
        coordinates: [chosen.end.coordinate, destination],
        distanceKm: chosen.accessEnd.distanceKm,
        durationMinutes: chosen.accessEnd.durationMinutes,
      },
    ],
  };
}

export function planRestaurantRoute(
  origin: Coordinate,
  destination: Coordinate,
  transit: TransitData,
  walkingLookup?: WalkingRouteLookup,
): RoutePlan {
  const options = [
    createWalkingOption(origin, destination, walkingLookup),
    createTelefericoOption(
      origin,
      destination,
      transit.telefericoStations,
      walkingLookup,
    ),
    createPumakatariOption(
      origin,
      destination,
      transit.pumakatariStops,
      transit.pumakatariRoutes,
      walkingLookup,
    ),
  ].filter((option): option is RouteOption => option !== null);
  const recommended = options.reduce((best, option) =>
    option.durationMinutes < best.durationMinutes ? option : best,
  );
  return { recommendedId: recommended.id, options };
}
