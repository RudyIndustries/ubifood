"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BusFront,
  CableCar,
  Clock3,
  Footprints,
  Leaf,
  LoaderCircle,
  MapPin,
  Navigation,
  Route as RouteIcon,
  X,
} from "lucide-react";
import maplibregl, { type Marker } from "maplibre-gl";
import { MapMenuDialog } from "@/components/map/map-menu-dialog";
import {
  publishClientLocation,
  subscribeClientLocation,
} from "@/lib/location/client-location";
import type { MenuItem, RestaurantTheme } from "@/lib/restaurants/types";
import {
  distanceKm,
  planRestaurantRoute,
  telefericoPedestrianCoordinate,
  type Coordinate,
  type RouteMode,
  type RouteOption,
  type RoutePlan,
  type RouteSegment,
  type TransitData,
} from "@/lib/transit/planner";

export type MapRestaurant = {
  id: string;
  name: string;
  slug: string;
  category: string;
  zone: string;
  address: string;
  latitude: number;
  longitude: number;
  color: string;
  startingPrice: number | null;
  availableItems: number;
  rescueCount: number;
  menuItems: MenuItem[];
  theme: Pick<
    RestaurantTheme,
    "primary_color" | "secondary_color" | "accent_color" | "notebook_style"
  >;
};

type RestaurantMapProps = {
  restaurants: MapRestaurant[];
};

type StreetRoute = {
  id: string;
  coordinates: Coordinate[];
  distanceKm: number;
  durationMinutes: number;
};

type StreetRoutingResult = {
  key: string;
  routes: StreetRoute[];
  partial: boolean;
  error?: string;
};

type DisplayRouteSegment = RouteSegment & { streetRouted?: boolean };
type DisplayRouteOption = Omit<RouteOption, "segments"> & {
  segments: DisplayRouteSegment[];
  streetComplete: boolean;
};
type RoutePreference = "less-walking" | "fastest";

const LA_PAZ_CENTER: [number, number] = [-68.15, -16.5];
const TELEFERICO_LAYERS = [
  "teleferico-lines-casing",
  "teleferico-lines",
  "teleferico-stations",
];
const PUMAKATARI_LAYERS = [
  "pumakatari-routes-casing",
  "pumakatari-routes",
  "pumakatari-stops",
];

function setLayersVisibility(
  map: maplibregl.Map,
  layerIds: string[],
  visible: boolean,
) {
  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  });
}

function walkingSegmentId(from: Coordinate, to: Coordinate) {
  return `${from[0].toFixed(6)},${from[1].toFixed(6)}:${to[0].toFixed(6)},${to[1].toFixed(6)}`;
}

export function RestaurantMap({ restaurants }: RestaurantMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selected, setSelected] = useState<MapRestaurant | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  const [activeRouteId, setActiveRouteId] = useState<RouteMode | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routePreference, setRoutePreference] =
    useState<RoutePreference>("less-walking");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTeleferico, setShowTeleferico] = useState(true);
  const [showPumakatari, setShowPumakatari] = useState(false);
  const [streetRoutingResult, setStreetRoutingResult] =
    useState<StreetRoutingResult | null>(null);
  const [accessRoutingResult, setAccessRoutingResult] =
    useState<StreetRoutingResult | null>(null);
  const accessWalkingRequest = useMemo(() => {
    if (!selected || !userLocation || !transitData) return null;
    const destination: Coordinate = [
      Number(selected.longitude),
      Number(selected.latitude),
    ];
    const uniquePairs = new Map<
      string,
      { id: string; from: Coordinate; to: Coordinate }
    >();
    const addPair = (from: Coordinate, to: Coordinate) => {
      const id = walkingSegmentId(from, to);
      uniquePairs.set(id, { id, from, to });
    };
    addPair(userLocation, destination);

    const stations = transitData.telefericoStations.features;
    [...stations]
      .sort(
        (a, b) =>
          distanceKm(userLocation, telefericoPedestrianCoordinate(a)) -
          distanceKm(userLocation, telefericoPedestrianCoordinate(b)),
      )
      .slice(0, 6)
      .forEach((station) =>
        addPair(userLocation, telefericoPedestrianCoordinate(station)),
      );
    [...stations]
      .sort(
        (a, b) =>
          distanceKm(destination, telefericoPedestrianCoordinate(a)) -
          distanceKm(destination, telefericoPedestrianCoordinate(b)),
      )
      .slice(0, 6)
      .forEach((station) =>
        addPair(telefericoPedestrianCoordinate(station), destination),
      );

    const pumakatariStops = transitData.pumakatariStops.features;
    [...pumakatariStops]
      .sort(
        (a, b) =>
          distanceKm(userLocation, a.geometry.coordinates) -
          distanceKm(userLocation, b.geometry.coordinates),
      )
      .slice(0, 5)
      .forEach((stop) => addPair(userLocation, stop.geometry.coordinates));
    [...pumakatariStops]
      .sort(
        (a, b) =>
          distanceKm(destination, a.geometry.coordinates) -
          distanceKm(destination, b.geometry.coordinates),
      )
      .slice(0, 5)
      .forEach((stop) => addPair(stop.geometry.coordinates, destination));

    const pairs = [...uniquePairs.values()];
    return {
      key: pairs.map((pair) => pair.id).sort().join("|"),
      pairs,
    };
  }, [selected, transitData, userLocation]);
  const routePlan = useMemo<RoutePlan | null>(() => {
    if (
      !selected ||
      !userLocation ||
      !transitData ||
      !accessWalkingRequest ||
      accessRoutingResult?.key !== accessWalkingRequest.key
    ) {
      return null;
    }
    const accessRoutes = new Map(
      accessRoutingResult.routes.map((route) => [route.id, route] as const),
    );
    return planRestaurantRoute(
      userLocation,
      [Number(selected.longitude), Number(selected.latitude)],
      transitData,
      (from, to) => accessRoutes.get(walkingSegmentId(from, to)),
    );
  }, [accessRoutingResult, accessWalkingRequest, selected, transitData, userLocation]);
  const walkingRequest = useMemo(() => {
    if (!routePlan) return null;
    const uniquePairs = new Map<
      string,
      { id: string; from: Coordinate; to: Coordinate }
    >();
    routePlan.options.forEach((option) =>
      option.segments.forEach((segment) => {
        if (
          segment.mode !== "walk" ||
          segment.routing === "station-connector" ||
          segment.coordinates.length < 2
        ) return;
        const from = segment.coordinates[0];
        const to = segment.coordinates.at(-1) as Coordinate;
        const id = walkingSegmentId(from, to);
        uniquePairs.set(id, { id, from, to });
      }),
    );
    const pairs = [...uniquePairs.values()];
    return pairs.length > 0
      ? { key: pairs.map((pair) => pair.id).sort().join("|"), pairs }
      : null;
  }, [routePlan]);
  const refinedPlan = useMemo(() => {
    if (!routePlan) return null;
    const streetResolved = Boolean(
      streetRoutingResult && streetRoutingResult.key === walkingRequest?.key,
    );
    const streetRoutes = new Map<string, StreetRoute>(
      streetResolved && streetRoutingResult
        ? streetRoutingResult.routes.map((route) => [route.id, route] as const)
        : [],
    );
    const options: DisplayRouteOption[] = routePlan.options.map((option) => {
      let walkingStepIndex = 0;
      const segments = option.segments.map<DisplayRouteSegment>((segment) => {
        if (segment.mode !== "walk") return segment;
        if (segment.routing === "station-connector") {
          return { ...segment, streetRouted: true };
        }
        const id = walkingSegmentId(
          segment.coordinates[0],
          segment.coordinates.at(-1) as Coordinate,
        );
        const streetRoute = streetRoutes.get(id);
        if (!streetRoute) return segment;
        return {
          ...segment,
          coordinates: streetRoute.coordinates,
          distanceKm: streetRoute.distanceKm,
          durationMinutes: streetRoute.durationMinutes,
          streetRouted: true,
        };
      });
      const oldWalkingDistance = option.segments
        .filter((segment) => segment.mode === "walk")
        .reduce((total, segment) => total + segment.distanceKm, 0);
      const oldWalkingDuration = option.segments
        .filter((segment) => segment.mode === "walk")
        .reduce((total, segment) => total + segment.durationMinutes, 0);
      const newWalkingDistance = segments
        .filter((segment) => segment.mode === "walk")
        .reduce((total, segment) => total + segment.distanceKm, 0);
      const newWalkingDuration = segments
        .filter((segment) => segment.mode === "walk")
        .reduce((total, segment) => total + segment.durationMinutes, 0);
      const walkingSegments = segments.filter((segment) => segment.mode === "walk");
      const steps = option.steps.map((step) => {
        if (step.mode !== "walk") return step;
        const walkingSegment = walkingSegments[walkingStepIndex];
        walkingStepIndex += 1;
        return walkingSegment?.streetRouted
          ? {
              ...step,
              detail: walkingSegment.routing === "station-connector"
                ? `${walkingSegment.distanceKm.toFixed(1)} km por el acceso`
                : `${walkingSegment.distanceKm.toFixed(1)} km por calles`,
            }
          : step;
      });
      const distanceKm = option.distanceKm - oldWalkingDistance + newWalkingDistance;
      const durationMinutes = Math.max(
        1,
        Math.round(option.durationMinutes - oldWalkingDuration + newWalkingDuration),
      );
      const streetComplete =
        !streetResolved ||
        Boolean(streetRoutingResult?.error) ||
        segments
          .filter((segment) => segment.mode === "walk")
          .every((segment) => segment.streetRouted);
      return {
        ...option,
        summary:
          option.id === "walk" && segments[0]?.streetRouted
            ? `${distanceKm.toFixed(1)} km por calles`
            : option.summary,
        distanceKm,
        durationMinutes,
        steps,
        segments,
        streetComplete,
      };
    });
    const availableOptions = options.filter((option) => option.streetComplete);
    const recommendationPool = availableOptions.length > 0 ? availableOptions : options;
    const walkingDistance = (option: DisplayRouteOption) =>
      option.segments
        .filter((segment) => segment.mode === "walk")
        .reduce((total, segment) => total + segment.distanceKm, 0);
    const recommended = recommendationPool.reduce((best, option) => {
      if (routePreference === "fastest") {
        return option.durationMinutes < best.durationMinutes ? option : best;
      }
      const walkingDifference = walkingDistance(option) - walkingDistance(best);
      if (Math.abs(walkingDifference) > 0.05) {
        return walkingDifference < 0 ? option : best;
      }
      return option.durationMinutes < best.durationMinutes ? option : best;
    });
    return { options, recommendedId: recommended.id };
  }, [routePlan, routePreference, streetRoutingResult, walkingRequest?.key]);
  const activeRoute = useMemo(() => {
    if (!refinedPlan) return null;
    return (
      refinedPlan.options.find(
        (option) => option.id === activeRouteId && option.streetComplete,
      ) ??
      refinedPlan.options.find(
        (option) => option.id === refinedPlan.recommendedId && option.streetComplete,
      ) ??
      null
    );
  }, [activeRouteId, refinedPlan]);
  const streetRoutingLoading = Boolean(
    walkingRequest && streetRoutingResult?.key !== walkingRequest.key,
  );
  const streetRoutingError =
    walkingRequest && streetRoutingResult?.key === walkingRequest.key
      ? streetRoutingResult.error
      : undefined;
  const streetRoutingPartial = Boolean(
    walkingRequest &&
      streetRoutingResult?.key === walkingRequest.key &&
      streetRoutingResult.partial,
  );

  useEffect(
    () =>
      subscribeClientLocation((location) => {
        setUserLocation([location.longitude, location.latitude]);
        setLocationMessage("Ubicacion detectada");
      }),
    [],
  );

  useEffect(() => {
    if (!accessWalkingRequest) return;
    const controller = new AbortController();
    fetch("/api/routes/walking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: accessWalkingRequest.pairs, metricsOnly: true }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          routes?: StreetRoute[];
          partial?: boolean;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron comparar los accesos");
        }
        return payload;
      })
      .then((payload) =>
        setAccessRoutingResult({
          key: accessWalkingRequest.key,
          routes: payload.routes ?? [],
          partial: Boolean(payload.partial),
        }),
      )
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setAccessRoutingResult({
            key: accessWalkingRequest.key,
            routes: [],
            partial: true,
            error: error.message,
          });
        }
      });
    return () => controller.abort();
  }, [accessWalkingRequest]);

  useEffect(() => {
    if (!walkingRequest) return;
    const controller = new AbortController();
    fetch("/api/routes/walking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairs: walkingRequest.pairs }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          routes?: StreetRoute[];
          partial?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "No se pudieron trazar las calles");
        return payload;
      })
      .then((payload) =>
        setStreetRoutingResult({
          key: walkingRequest.key,
          routes: payload.routes ?? [],
          partial: Boolean(payload.partial),
        }),
      )
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setStreetRoutingResult({
            key: walkingRequest.key,
            routes: [],
            partial: true,
            error: error.message,
          });
        }
      });
    return () => controller.abort();
  }, [walkingRequest]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: LA_PAZ_CENTER,
      zoom: 12.4,
      minZoom: 10,
      maxZoom: 18,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    geolocateRef.current = geolocate;
    geolocate.on("geolocate", (event) => {
      const position = event as GeolocationPosition;
      publishClientLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    });
    geolocate.on("error", () =>
      setLocationMessage("No pudimos acceder a tu ubicacion"),
    );
    map.addControl(geolocate, "top-right");
    const resizeMap = () => map.resize();
    const resizeObserver = new ResizeObserver(resizeMap);
    resizeObserver.observe(container);
    const resizeFrame = window.requestAnimationFrame(resizeMap);
    map.on("load", () => {
      map.addSource("teleferico-lines", {
        type: "geojson",
        data: "/data/transit/teleferico-lines.geojson",
      });
      map.addSource("teleferico-stations", {
        type: "geojson",
        data: "/data/transit/teleferico-stations.geojson",
      });
      map.addSource("pumakatari-routes", {
        type: "geojson",
        data: "/data/transit/pumakatari-routes.geojson",
      });
      map.addSource("pumakatari-stops", {
        type: "geojson",
        data: "/data/transit/pumakatari-stops.geojson",
      });
      map.addSource("planned-route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      const telefericoColor = [
        "match",
        ["get", "nombre"],
        "Linea Roja",
        "#e31a1c",
        "Linea Amarilla",
        "#f2c500",
        "Linea Verde",
        "#299438",
        "Linea Azul",
        "#0874c9",
        "Linea Naranja",
        "#ef8b21",
        "Linea Blanca",
        "#f7f7f4",
        "Linea Celeste",
        "#31a9df",
        "Linea Morada",
        "#843a9b",
        "Linea Cafe",
        "#765c42",
        "Linea Plateada",
        "#8d9499",
        "#555555",
      ] as maplibregl.ExpressionSpecification;
      const pumakatariColor = [
        "match",
        ["get", "corridor"],
        "Caja Ferroviaria",
        "#d62828",
        "Chasquipampa",
        "#277da1",
        "Inca Llojeta",
        "#7b2cbf",
        "Irpavi II (Norte)",
        "#008f5a",
        "Villa Salome",
        "#e07a00",
        "#211c18",
      ] as maplibregl.ExpressionSpecification;

      map.addLayer({
        id: "teleferico-lines-casing",
        type: "line",
        source: "teleferico-lines",
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.92,
        },
      });
      map.addLayer({
        id: "teleferico-lines",
        type: "line",
        source: "teleferico-lines",
        paint: {
          "line-color": telefericoColor,
          "line-width": 5,
          "line-opacity": 0.96,
        },
      });
      map.addLayer({
        id: "teleferico-stations",
        type: "circle",
        source: "teleferico-stations",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3, 15, 7],
          "circle-color": [
            "match",
            ["get", "estacion"],
            "Estacion Roja",
            "#e31a1c",
            "Estacion Amarilla",
            "#f2c500",
            "Estacion Verde",
            "#299438",
            "Estacion Azul",
            "#0874c9",
            "Estacion Naranja",
            "#ef8b21",
            "Estacion Blanca",
            "#f7f7f4",
            "Estacion Celeste",
            "#31a9df",
            "Estacion Morada",
            "#843a9b",
            "#8d9499",
          ],
          "circle-stroke-color": "#211c18",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "pumakatari-routes-casing",
        type: "line",
        source: "pumakatari-routes",
        layout: { visibility: "none" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "pumakatari-routes",
        type: "line",
        source: "pumakatari-routes",
        layout: { visibility: "none" },
        paint: {
          "line-color": pumakatariColor,
          "line-width": 5,
          "line-opacity": 0.88,
        },
      });
      map.addLayer({
        id: "pumakatari-stops",
        type: "circle",
        source: "pumakatari-stops",
        minzoom: 13.5,
        layout: { visibility: "none" },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13.5, 2, 17, 5],
          "circle-color": "#ffffff",
          "circle-stroke-color": "#211c18",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "planned-route-casing",
        type: "line",
        source: "planned-route",
        paint: {
          "line-color": "#ffffff",
          "line-width": 10,
          "line-opacity": 0.94,
        },
      });
      map.addLayer({
        id: "planned-route-walk",
        type: "line",
        source: "planned-route",
        filter: ["==", ["get", "mode"], "walk"],
        paint: {
          "line-color": "#211c18",
          "line-width": 5,
          "line-dasharray": [1, 1.4],
        },
      });
      map.addLayer({
        id: "planned-route-transit",
        type: "line",
        source: "planned-route",
        filter: ["!=", ["get", "mode"], "walk"],
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
        },
      });

      const showFeaturePopup = (
        event: maplibregl.MapLayerMouseEvent,
        property: string,
      ) => {
        const value = event.features?.[0]?.properties?.[property];
        if (!value) return;
        new maplibregl.Popup({ closeButton: false, offset: 8 })
          .setLngLat(event.lngLat)
          .setText(String(value))
          .addTo(map);
      };
      map.on("click", "teleferico-lines", (event) =>
        showFeaturePopup(event, "nombre"),
      );
      map.on("click", "teleferico-stations", (event) =>
        showFeaturePopup(event, "nombre"),
      );
      map.on("click", "pumakatari-routes", (event) =>
        showFeaturePopup(event, "corridor"),
      );
      map.on("click", "pumakatari-stops", (event) =>
        showFeaturePopup(event, "direccion"),
      );
      ["teleferico-lines", "teleferico-stations", "pumakatari-routes", "pumakatari-stops"].forEach(
        (layerId) => {
          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        },
      );

      map.resize();
      setMapReady(true);
    });
    return () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      geolocateRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/transit/teleferico-stations.geojson").then((response) => response.json()),
      fetch("/data/transit/teleferico-lines.geojson").then((response) => response.json()),
      fetch("/data/transit/pumakatari-stops.geojson").then((response) => response.json()),
      fetch("/data/transit/pumakatari-routes.geojson").then((response) => response.json()),
    ])
      .then(([telefericoStations, telefericoLines, pumakatariStops, pumakatariRoutes]) => {
        if (!cancelled) {
          setTransitData({
            telefericoStations,
            telefericoLines,
            pumakatariStops,
            pumakatariRoutes,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLocationMessage("No se pudieron cargar las rutas");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource("planned-route") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const features = routeOpen && activeRoute
      ? activeRoute.segments
          .filter((segment) => segment.mode !== "walk" || segment.streetRouted)
          .map((segment) => ({
          type: "Feature" as const,
          properties: { mode: segment.mode, color: segment.color },
          geometry: { type: "LineString" as const, coordinates: segment.coordinates },
          }))
      : [];
    source.setData({ type: "FeatureCollection", features });
    if (routeOpen && activeRoute) {
      const bounds = new maplibregl.LngLatBounds();
      activeRoute.segments
        .filter((segment) => segment.mode !== "walk" || segment.streetRouted)
        .forEach((segment) =>
          segment.coordinates.forEach((coordinate) => bounds.extend(coordinate)),
        );
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 650 });
      }
    }
  }, [activeRoute, mapReady, routeOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const showReferenceNetwork = !(routeOpen && activeRoute);
    setLayersVisibility(map, TELEFERICO_LAYERS, showTeleferico && showReferenceNetwork);
    setLayersVisibility(map, PUMAKATARI_LAYERS, showPumakatari && showReferenceNetwork);
  }, [activeRoute, mapReady, routeOpen, showPumakatari, showTeleferico]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const bounds = new maplibregl.LngLatBounds();
    let validLocations = 0;

    restaurants.forEach((restaurant) => {
      const latitude = Number(restaurant.latitude);
      const longitude = Number(restaurant.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

      const markerShell = document.createElement("div");
      markerShell.className = "ubifood-map-marker-shell";
      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.className = "ubifood-map-marker";
      markerButton.style.setProperty("--marker-color", restaurant.color);
      markerButton.setAttribute("aria-label", `Ver ${restaurant.name}`);
      markerShell.appendChild(markerButton);

      const price = document.createElement("span");
      price.textContent = restaurant.startingPrice === null
        ? "Menu"
        : `Bs ${restaurant.startingPrice.toFixed(0)}`;
      markerButton.appendChild(price);

      if (restaurant.rescueCount > 0) {
        const rescue = document.createElement("span");
        rescue.className = "ubifood-map-marker-rescue";
        rescue.textContent = String(restaurant.rescueCount);
        markerButton.appendChild(rescue);
      }

      markerButton.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelected(restaurant);
        setRouteOpen(false);
        setMenuOpen(false);
        setActiveRouteId(null);
        map.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 14) });
      });

      const marker = new maplibregl.Marker({
        element: markerShell,
        anchor: "bottom",
      })
        .setLngLat([longitude, latitude])
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([longitude, latitude]);
      validLocations += 1;
    });

    if (validLocations > 1) {
      map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 700 });
    } else if (validLocations === 1) {
      map.easeTo({ center: bounds.getCenter(), zoom: 14, duration: 700 });
    } else {
      map.easeTo({ center: LA_PAZ_CENTER, zoom: 12.4, duration: 700 });
    }
  }, [mapReady, restaurants]);

  return (
    <>
    <div className="relative h-[62vh] min-h-[500px] max-h-[720px] overflow-hidden rounded-lg border border-black/10 bg-[#dfe8e5]">
      <div
        ref={containerRef}
        className="restaurant-map-canvas absolute inset-0 size-full"
        aria-label="Mapa de restaurantes en La Paz"
      />
      {!mapReady && (
        <div className="absolute inset-0 grid place-items-center bg-[#eef3f1] text-sm font-black text-black/55">
          Cargando mapa de La Paz...
        </div>
      )}
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-100px)] items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold shadow-lg backdrop-blur">
        <Navigation size={15} className="text-[#277da1]" />
        {locationMessage ?? "Usa el boton de ubicacion para encontrarte"}
      </div>
      <div className="absolute left-3 top-14 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowTeleferico((visible) => !visible)}
          aria-pressed={showTeleferico}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black shadow-lg ${
            showTeleferico
              ? "bg-[#d62828] text-white"
              : "bg-white/95 text-black/60"
          }`}
        >
          <CableCar size={16} /> Teleferico
        </button>
        <button
          type="button"
          onClick={() => setShowPumakatari((visible) => !visible)}
          aria-pressed={showPumakatari}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black shadow-lg ${
            showPumakatari
              ? "bg-[#277da1] text-white"
              : "bg-white/95 text-black/60"
          }`}
        >
          <BusFront size={16} /> PumaKatari
        </button>
      </div>
      {showPumakatari && (
        <p className="absolute left-3 top-[100px] max-w-[285px] rounded-lg bg-white/95 px-3 py-2 text-[11px] font-bold leading-4 text-black/55 shadow-lg">
          5 corredores con geometria municipal 2018. Achumani e Integradora pendientes de trazado abierto verificable.
        </p>
      )}
      {restaurants.length === 0 && mapReady && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-lg bg-white px-4 py-3 text-center text-sm font-bold shadow-lg">
          No hay restaurantes para estos filtros.
        </div>
      )}
      {selected && (
        <article className="absolute inset-x-3 bottom-3 max-h-[calc(100%-24px)] overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:left-3 sm:right-auto sm:w-[390px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black" style={{ color: selected.color }}>{selected.category}</p>
              <h3 className="truncate text-lg font-black">{selected.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-black/50">
                <MapPin size={14} /> {selected.zone}, {selected.address}
              </p>
            </div>
            <p className="whitespace-nowrap text-base font-black" style={{ color: selected.color }}>
              {selected.startingPrice === null ? "Sin precios" : `Desde Bs ${selected.startingPrice.toFixed(2)}`}
            </p>
          </div>
          {!routeOpen ? (
            <div className="mt-3 border-t border-black/5 pt-3">
              <div className="mb-3 flex gap-2 text-xs font-bold text-black/50">
                <span>{selected.availableItems} platos</span>
                {selected.rescueCount > 0 && (
                  <span className="flex items-center gap-1 text-[#18664f]"><Leaf size={14} /> {selected.rescueCount} rescates</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black text-white"
                  style={{ backgroundColor: selected.color }}
                >
                  <BookOpen size={16} /> Ver menu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRouteOpen(true);
                    if (!userLocation) {
                      setLocationMessage("Autoriza tu ubicacion para planear");
                      geolocateRef.current?.trigger();
                    }
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#211c18] text-xs font-black text-white"
                >
                  <RouteIcon size={16} /> Como llegar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 border-t border-black/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#277da1]">Ruta por calles y transporte</p>
                  <p className="text-sm font-black">Desde tu ubicacion</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRouteOpen(false);
                    setActiveRouteId(null);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-black text-[#a32323] hover:bg-[#fff0ed]"
                >
                  <X size={14} /> Cancelar viaje
                </button>
              </div>
              {!userLocation ? (
                <div className="mt-3 rounded-lg bg-[#f7f4ed] p-3 text-xs font-bold leading-5 text-black/60">
                  Esperando permiso de ubicacion del dispositivo...
                </div>
              ) : !refinedPlan ? (
                <div className="mt-3 rounded-lg bg-[#f7f4ed] p-3 text-xs font-bold text-black/60">
                  Calculando alternativas...
                </div>
              ) : (
                <>
                  <div
                    className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-[#f1eee8] p-1"
                    aria-label="Prioridad de la ruta"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRoutePreference("less-walking");
                        setActiveRouteId(null);
                      }}
                      aria-pressed={routePreference === "less-walking"}
                      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-[11px] font-black ${
                        routePreference === "less-walking"
                          ? "bg-white text-[#211c18] shadow-sm"
                          : "text-black/45"
                      }`}
                    >
                      <Footprints size={15} /> Caminar menos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRoutePreference("fastest");
                        setActiveRouteId(null);
                      }}
                      aria-pressed={routePreference === "fastest"}
                      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-[11px] font-black ${
                        routePreference === "fastest"
                          ? "bg-white text-[#211c18] shadow-sm"
                          : "text-black/45"
                      }`}
                    >
                      <Clock3 size={15} /> Mas rapida
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-[#f1eee8] p-1">
                    {refinedPlan.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setActiveRouteId(option.id)}
                        disabled={!option.streetComplete}
                        aria-pressed={activeRoute?.id === option.id}
                        className={`relative flex min-h-16 flex-col items-center justify-center rounded-md px-1 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-35 ${
                          activeRoute?.id === option.id
                            ? "bg-white text-[#211c18] shadow-sm"
                            : "text-black/50"
                        }`}
                      >
                        {option.id === "walk" ? <Footprints size={17} /> : option.id === "teleferico" ? <CableCar size={17} /> : <BusFront size={17} />}
                        <span className="mt-1">
                          {option.streetComplete ? `${option.durationMinutes} min` : "Sin acceso"}
                        </span>
                        {option.streetComplete && (
                          <span className="mt-0.5 text-[9px] font-bold text-black/40">
                            {option.segments
                              .filter((segment) => segment.mode === "walk")
                              .reduce((total, segment) => total + segment.distanceKm, 0)
                              .toFixed(1)}{" "}
                            km a pie
                          </span>
                        )}
                        {refinedPlan.recommendedId === option.id && (
                          <span className="absolute -top-2 rounded bg-[#43aa8b] px-1.5 py-0.5 text-[8px] text-white">Mejor</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {streetRoutingLoading && (
                    <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[#277da1]">
                      <LoaderCircle size={14} className="animate-spin" /> Trazando los caminos a pie...
                    </p>
                  )}
                  {streetRoutingError && (
                    <p className="mt-2 text-[11px] font-bold text-[#8a5a00]">
                      Conexion inestable: mostramos una estimacion y reintentaremos al recalcular.
                    </p>
                  )}
                  {streetRoutingPartial && !streetRoutingError && (
                    <p className="mt-2 text-[11px] font-bold text-[#8a5a00]">
                      Un acceso peatonal no conecta con una calle. Revisa la ubicacion exacta del restaurante.
                    </p>
                  )}
                  {activeRoute && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black">{activeRoute.label}</p>
                        <p className="flex items-center gap-1 text-xs font-black text-black/55">
                          <Clock3 size={14} /> {activeRoute.durationMinutes} min · {activeRoute.distanceKm.toFixed(1)} km
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-black/45">{activeRoute.summary}</p>
                      <ol className="mt-3 space-y-2 border-l-2 border-[#277da1]/25 pl-3">
                        {activeRoute.steps.map((step, index) => (
                          <li key={`${step.title}-${index}`} className="relative">
                            <span className="absolute -left-[17px] top-1 size-2 rounded-full bg-[#277da1] ring-2 ring-white" />
                            <p className="text-xs font-black">{step.title}</p>
                            <p className="text-[11px] font-semibold text-black/50">{step.detail}</p>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-3 text-[10px] font-semibold leading-4 text-black/40">
                        Los tramos a pie siguen calles de OpenStreetMap. Confirma horarios y operacion del transporte antes de viajar.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </article>
      )}
    </div>
    {selected && (
      <MapMenuDialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        restaurantName={selected.name}
        restaurantSlug={selected.slug}
        items={selected.menuItems}
        theme={selected.theme}
      />
    )}
    </>
  );
}
