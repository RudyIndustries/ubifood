"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BusFront,
  CableCar,
  Clock3,
  Footprints,
  Leaf,
  MapPin,
  Navigation,
  Route as RouteIcon,
} from "lucide-react";
import maplibregl, { type Marker } from "maplibre-gl";
import { MapMenuDialog } from "@/components/map/map-menu-dialog";
import {
  publishClientLocation,
  subscribeClientLocation,
} from "@/lib/location/client-location";
import type { MenuItem, RestaurantTheme } from "@/lib/restaurants/types";
import {
  planRestaurantRoute,
  type Coordinate,
  type RouteMode,
  type RoutePlan,
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
    "primary_color" | "secondary_color" | "accent_color"
  >;
};

type RestaurantMapProps = {
  restaurants: MapRestaurant[];
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTeleferico, setShowTeleferico] = useState(true);
  const [showPumakatari, setShowPumakatari] = useState(false);
  const routePlan = useMemo<RoutePlan | null>(() => {
    if (!selected || !userLocation || !transitData) return null;
    return planRestaurantRoute(
      userLocation,
      [Number(selected.longitude), Number(selected.latitude)],
      transitData,
    );
  }, [selected, transitData, userLocation]);
  const activeRoute = useMemo(() => {
    if (!routePlan) return null;
    return (
      routePlan.options.find((option) => option.id === activeRouteId) ??
      routePlan.options.find((option) => option.id === routePlan.recommendedId) ??
      null
    );
  }, [activeRouteId, routePlan]);

  useEffect(
    () =>
      subscribeClientLocation((location) => {
        setUserLocation([location.longitude, location.latitude]);
        setLocationMessage("Ubicacion detectada");
      }),
    [],
  );

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
    map.on("click", () => {
      setSelected(null);
      setRouteOpen(false);
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
    const features = activeRoute
      ? activeRoute.segments.map((segment) => ({
          type: "Feature" as const,
          properties: { mode: segment.mode, color: segment.color },
          geometry: { type: "LineString" as const, coordinates: segment.coordinates },
        }))
      : [];
    source.setData({ type: "FeatureCollection", features });
    if (activeRoute) {
      const bounds = new maplibregl.LngLatBounds();
      activeRoute.segments.forEach((segment) =>
        segment.coordinates.forEach((coordinate) => bounds.extend(coordinate)),
      );
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 650 });
      }
    }
  }, [activeRoute, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    setLayersVisibility(map, TELEFERICO_LAYERS, showTeleferico);
    setLayersVisibility(map, PUMAKATARI_LAYERS, showPumakatari);
  }, [mapReady, showPumakatari, showTeleferico]);

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

      const markerButton = document.createElement("button");
      markerButton.type = "button";
      markerButton.className = "ubifood-map-marker";
      markerButton.style.setProperty("--marker-color", restaurant.color);
      markerButton.setAttribute("aria-label", `Ver ${restaurant.name}`);

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
        element: markerButton,
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
                  <p className="text-xs font-black text-[#277da1]">Ruta estimada</p>
                  <p className="text-sm font-black">Desde tu ubicacion</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRouteOpen(false)}
                  className="h-8 rounded-md px-2 text-xs font-black text-black/50 hover:bg-black/5"
                >
                  Volver
                </button>
              </div>
              {!userLocation ? (
                <div className="mt-3 rounded-lg bg-[#f7f4ed] p-3 text-xs font-bold leading-5 text-black/60">
                  Esperando permiso de ubicacion del dispositivo...
                </div>
              ) : !routePlan ? (
                <div className="mt-3 rounded-lg bg-[#f7f4ed] p-3 text-xs font-bold text-black/60">
                  Calculando alternativas...
                </div>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-[#f1eee8] p-1">
                    {routePlan.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setActiveRouteId(option.id)}
                        aria-pressed={activeRoute?.id === option.id}
                        className={`relative flex min-h-14 flex-col items-center justify-center rounded-md px-1 text-[10px] font-black ${
                          activeRoute?.id === option.id
                            ? "bg-white text-[#211c18] shadow-sm"
                            : "text-black/50"
                        }`}
                      >
                        {option.id === "walk" ? <Footprints size={17} /> : option.id === "teleferico" ? <CableCar size={17} /> : <BusFront size={17} />}
                        <span className="mt-1">{option.durationMinutes} min</span>
                        {routePlan.recommendedId === option.id && (
                          <span className="absolute -top-2 rounded bg-[#43aa8b] px-1.5 py-0.5 text-[8px] text-white">Mejor</span>
                        )}
                      </button>
                    ))}
                  </div>
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
                        Referencia MVP basada en distancia y trazados disponibles; confirma horarios y paradas antes de viajar.
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
