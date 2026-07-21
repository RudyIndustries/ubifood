"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CloudRain,
  LocateFixed,
  Moon,
  RefreshCw,
  ShieldCheck,
  SunMedium,
  Umbrella,
} from "lucide-react";
import {
  publishClientLocation,
  subscribeClientLocation,
  type ClientLocation,
} from "@/lib/location/client-location";

type WeatherData = {
  uvIndex: number;
  uvMax: number;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitation: number;
  rainChance: number;
  isDay: boolean;
  observedAt: string;
  source: string;
};

type WeatherResult = {
  key: string;
  data?: WeatherData;
  error?: string;
};

function locationKey(location: ClientLocation) {
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
}

function uvLevel(index: number) {
  if (index >= 11) return { label: "Extremo", color: "#7b2cbf", text: "white" };
  if (index >= 8) return { label: "Muy alto", color: "#d62828", text: "white" };
  if (index >= 6) return { label: "Alto", color: "#e07a00", text: "white" };
  if (index >= 3) return { label: "Moderado", color: "#f9c74f", text: "#211c18" };
  return { label: "Bajo", color: "#43aa8b", text: "#102e27" };
}

function weatherAdvice(weather: WeatherData) {
  const rainExpected = weather.precipitation > 0 || weather.rainChance >= 40;
  if (rainExpected) {
    return {
      title: "Lleva paraguas",
      detail: `${weather.rainChance}% de lluvia en las proximas horas`,
      icon: CloudRain,
    };
  }
  if (!weather.isDay || weather.uvIndex < 3) {
    return {
      title: "No necesitas paraguas por UV",
      detail: weather.isDay ? "Radiacion baja ahora" : "Sin radiacion solar ahora",
      icon: weather.isDay ? ShieldCheck : Moon,
    };
  }
  if (weather.uvIndex >= 8) {
    return {
      title: "Lleva paraguas o sombrero",
      detail: "Busca sombra, usa bloqueador y lentes",
      icon: Umbrella,
    };
  }
  return {
    title: "Protegete del sol",
    detail: "Usa bloqueador, gorra y busca sombra",
    icon: SunMedium,
  };
}

export function UvAdvisor() {
  const [location, setLocation] = useState<ClientLocation | null>(null);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const key = location ? locationKey(location) : null;

  useEffect(() => subscribeClientLocation(setLocation), []);
  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    const requestKey = locationKey(location);
    fetch(`/api/weather?lat=${location.latitude}&lon=${location.longitude}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as WeatherData & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar el clima");
        return payload;
      })
      .then((data) => setResult({ key: requestKey, data }))
      .catch((error: Error) => {
        if (error.name !== "AbortError") {
          setResult({ key: requestKey, error: error.message });
        }
      });
    return () => controller.abort();
  }, [location]);

  const weather = result?.key === key ? result.data : undefined;
  const advice = useMemo(() => (weather ? weatherAdvice(weather) : null), [weather]);
  const level = weather ? uvLevel(weather.uvIndex) : null;

  const requestLocation = () => {
    setPermissionError(null);
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      setPermissionError("Tu dispositivo no permite geolocalizacion");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        publishClientLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        setLocating(false);
        setPermissionError("Activa el permiso de ubicacion para ver el UV");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };

  if (!location) {
    return (
      <button
        type="button"
        onClick={requestLocation}
        className="flex min-h-24 w-full items-center gap-3 rounded-lg bg-white/10 p-3 text-left transition hover:bg-white/15"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#f9c74f] text-[#211c18]">
          {locating ? <RefreshCw size={23} className="animate-spin" /> : <LocateFixed size={23} />}
        </span>
        <span>
          <span className="block font-black">{locating ? "Buscando ubicacion" : "Ver UV de mi zona"}</span>
          <span className="mt-1 block text-xs font-semibold text-white/55">
            {permissionError ?? (locating ? "Consultando el GPS" : "Usar ubicacion actual")}
          </span>
        </span>
      </button>
    );
  }

  if (!weather) {
    const failed = result?.key === key ? result.error : null;
    return (
      <div className="flex min-h-24 items-center gap-3 rounded-lg bg-white/10 p-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/10">
          <RefreshCw size={22} className={failed ? "" : "animate-spin"} />
        </span>
        <div>
          <p className="font-black">{failed ? "Clima no disponible" : "Consultando el UV"}</p>
          <p className="mt-1 text-xs font-semibold text-white/55">
            {failed ?? "Buscando el pronostico de tu area"}
          </p>
          {failed && (
            <button type="button" onClick={requestLocation} className="mt-2 text-xs font-black text-[#f9c74f]">
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  const AdviceIcon = advice?.icon ?? SunMedium;
  return (
    <div className="ubifood-lift overflow-hidden rounded-lg bg-white text-[#211c18] shadow-lg shadow-black/15">
      <div className="grid grid-cols-[84px_1fr]">
        <div
          className="grid min-h-24 place-items-center p-3 text-center"
          style={{ backgroundColor: level?.color, color: level?.text }}
        >
          <div>
            <p className="text-[10px] font-black uppercase">UV ahora</p>
            <p className="text-4xl font-black leading-none">{weather.uvIndex.toFixed(1)}</p>
            <p className="mt-1 text-[10px] font-black">{level?.label}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 p-3">
          <AdviceIcon size={28} className="shrink-0 text-[#277da1]" />
          <div className="min-w-0">
            <p className="font-black leading-5">{advice?.title}</p>
            <p className="mt-0.5 text-xs font-semibold leading-4 text-black/55">{advice?.detail}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 border-t border-black/10 text-center text-[10px] font-bold text-black/55">
        <span className="px-2 py-2">{weather.temperature.toFixed(0)} °C</span>
        <span className="border-x border-black/10 px-2 py-2">Lluvia {weather.rainChance}%</span>
        <span className="px-2 py-2">Max UV {weather.uvMax.toFixed(1)}</span>
      </div>
    </div>
  );
}
