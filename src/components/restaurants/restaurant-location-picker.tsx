"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import maplibregl from "maplibre-gl";

type RestaurantLocationPickerProps = {
  defaultLatitude: number;
  defaultLongitude: number;
};

const LA_PAZ_CENTER: [number, number] = [-68.15, -16.5];

export function RestaurantLocationPicker({
  defaultLatitude,
  defaultLongitude,
}: RestaurantLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [coordinate, setCoordinate] = useState<[number, number]>([
    Number.isFinite(defaultLongitude) ? defaultLongitude : LA_PAZ_CENTER[0],
    Number.isFinite(defaultLatitude) ? defaultLatitude : LA_PAZ_CENTER[1],
  ]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const container = containerRef.current;
    const initialCoordinate: [number, number] = [
      Number.isFinite(defaultLongitude) ? defaultLongitude : LA_PAZ_CENTER[0],
      Number.isFinite(defaultLatitude) ? defaultLatitude : LA_PAZ_CENTER[1],
    ];
    const map = new maplibregl.Map({
      container,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: initialCoordinate,
      zoom: 15,
      minZoom: 10,
      maxZoom: 19,
      attributionControl: false,
    });
    const marker = new maplibregl.Marker({
      color: "#d62828",
      draggable: true,
    })
      .setLngLat(initialCoordinate)
      .addTo(map);

    const updateCoordinate = (longitude: number, latitude: number) => {
      const next: [number, number] = [longitude, latitude];
      marker.setLngLat(next);
      setCoordinate(next);
    };

    marker.on("dragend", () => {
      const next = marker.getLngLat();
      setCoordinate([next.lng, next.lat]);
    });
    map.on("click", (event) => updateCoordinate(event.lngLat.lng, event.lngLat.lat));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);
    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      resizeObserver.disconnect();
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [defaultLatitude, defaultLongitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        markerRef.current?.setLngLat(next);
        mapRef.current?.easeTo({ center: next, zoom: 17 });
        setCoordinate(next);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-black/65">
          <MapPin size={16} /> Ubicacion en el mapa
        </p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-[#277da1] px-3 text-xs font-black text-white disabled:opacity-60"
        >
          <LocateFixed size={15} />
          {locating ? "Ubicando..." : "Mi ubicacion"}
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-lg border border-black/10 bg-[#dfe8e5]"
        aria-label="Seleccionar ubicacion exacta del restaurante"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="rounded-md bg-white px-3 py-2 text-xs font-bold text-black/50">
          Latitud
          <input
            name="latitude"
            value={coordinate[1].toFixed(6)}
            readOnly
            className="mt-1 block w-full bg-transparent font-black text-[#211c18] outline-none"
          />
        </label>
        <label className="rounded-md bg-white px-3 py-2 text-xs font-bold text-black/50">
          Longitud
          <input
            name="longitude"
            value={coordinate[0].toFixed(6)}
            readOnly
            className="mt-1 block w-full bg-transparent font-black text-[#211c18] outline-none"
          />
        </label>
      </div>
    </div>
  );
}
