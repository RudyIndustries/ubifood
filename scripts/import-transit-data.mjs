import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://sitservicios.lapaz.bo/sit/ods/mapas/Mapa_17/data";
const TELEFERICO_APP_URL =
  "https://www.miteleferico.bo/_nuxt/11e8e4a.js";
const OUTPUT_DIR = path.join(process.cwd(), "public", "data", "transit");

const sources = {
  pumakatariRoutes: ["RutasPumakatari1.js", "json_RutasPumakatari1"],
  pumakatariStops: ["ParadasPumakatari2.js", "json_ParadasPumakatari2"],
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function repairText(value) {
  if (typeof value !== "string" || !/[ÃÂ]/.test(value)) {
    return value;
  }
  return Buffer.from(value, "latin1").toString("utf8");
}

async function fetchLayer(fileName, variableName) {
  const response = await fetch(`${BASE_URL}/${fileName}`);
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${fileName}: HTTP ${response.status}`);
  }

  const source = await response.text();
  const assignment = `var ${variableName} =`;
  const start = source.indexOf(assignment);
  if (start === -1) {
    throw new Error(`No se encontro ${variableName} en ${fileName}`);
  }

  const jsonText = source
    .slice(start + assignment.length)
    .trim()
    .replace(/;\s*$/, "");
  const collection = JSON.parse(jsonText);
  return {
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      properties: Object.fromEntries(
        Object.entries(feature.properties ?? {}).map(([key, value]) => [
          key,
          repairText(value),
        ]),
      ),
    })),
  };
}

async function fetchOfficialTeleferico() {
  const response = await fetch(TELEFERICO_APP_URL);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la red oficial: HTTP ${response.status}`);
  }

  const source = await response.text();
  const linePattern =
    /recorrido-(roja|amarilla|verde|azul|naranja|blanca|celeste|morada|cafe|plateada)\.png/g;
  const matches = [...source.matchAll(linePattern)];
  const lines = [];
  const stations = [];

  matches.forEach((match, index) => {
    const slug = match[1];
    const segment = source.slice(
      match.index,
      matches[index + 1]?.index ?? source.length,
    );
    const stationPattern =
      /nombre:"(Estaci[^"]+)",direccion:"([^"]*)",latitud:"(-?\d+\.\d+)",longitud:"(-?\d+\.\d+)"/g;
    const stationMatches = [...segment.matchAll(stationPattern)];
    if (stationMatches.length < 2) return;

    const lineName = `${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    const lineStations = stationMatches.map((stationMatch) => {
      const station = {
        type: "Feature",
        properties: {
          estacion: `Estacion ${lineName}`,
          nombre: repairText(stationMatch[1]),
          direccion: repairText(stationMatch[2]),
          system: "Mi Teleferico",
          source: "official_web_app",
        },
        geometry: {
          type: "Point",
          coordinates: [Number(stationMatch[4]), Number(stationMatch[3])],
        },
      };
      stations.push(station);
      return station;
    });

    lines.push({
      type: "Feature",
      properties: {
        nombre: `Linea ${lineName}`,
        system: "Mi Teleferico",
        source: "official_web_app",
      },
      geometry: {
        type: "LineString",
        coordinates: lineStations.map(
          (station) => station.geometry.coordinates,
        ),
      },
    });
  });

  if (lines.length !== 10) {
    throw new Error(
      `La fuente oficial devolvio ${lines.length} lineas en lugar de 10`,
    );
  }

  return {
    lines: withMetadata(
      { type: "FeatureCollection", features: lines },
      {
        source: "Mi Teleferico",
        source_url: "https://www.miteleferico.bo/mapa-rim/",
        lines: lines.length,
      },
    ),
    stations: withMetadata(
      { type: "FeatureCollection", features: stations },
      {
        source: "Mi Teleferico",
        source_url: "https://www.miteleferico.bo/mapa-rim/",
      },
    ),
  };
}

function pumakatariCorridor(routeName) {
  const route = normalize(routeName);
  if (route.includes("SIETE LAGUNAS")) return "Caja Ferroviaria";
  if (route.includes("CHASQUIPAMPA")) return "Chasquipampa";
  if (route.includes("INCA LLOJETA")) return "Inca Llojeta";
  if (route.includes("IRPAVI II")) return "Irpavi II (Norte)";
  if (route.includes("VILLA SALOME")) return "Villa Salome";
  if (route.includes("KALAJAHUIRA")) return null;
  return routeName;
}

function withMetadata(collection, metadata) {
  return {
    ...collection,
    metadata,
  };
}

function preparePumakatariRoutes(collection) {
  const features = collection.features.flatMap((feature) => {
    const corridor = pumakatariCorridor(feature.properties?.ruta);
    if (!corridor) return [];
    return [
      {
        ...feature,
        properties: {
          ...feature.properties,
          corridor,
          system: "PumaKatari",
          source_year: 2018,
        },
      },
    ];
  });

  return withMetadata(
    { type: "FeatureCollection", features },
    {
      source: "Gobierno Autonomo Municipal de La Paz",
      source_url:
        "https://sitservicios.lapaz.bo/sit/ods/mapas/Mapa_17/index.html",
      geometry_year: 2018,
      note: "Referencia geografica historica; validar cambios operativos.",
    },
  );
}

function preparePumakatariStops(collection) {
  const features = collection.features.flatMap((feature) => {
    const corridor = pumakatariCorridor(feature.properties?.ruta);
    if (!corridor || normalize(corridor).includes("ESTACION DE TRANSFERENCIA")) {
      return [];
    }
    return [
      {
        ...feature,
        properties: {
          ...feature.properties,
          corridor,
          system: "PumaKatari",
          source_year: 2018,
        },
      },
    ];
  });

  return withMetadata(
    { type: "FeatureCollection", features },
    {
      source: "Gobierno Autonomo Municipal de La Paz",
      geometry_year: 2018,
    },
  );
}

async function saveJson(fileName, data) {
  await writeFile(
    path.join(OUTPUT_DIR, fileName),
    `${JSON.stringify(data)}\n`,
    "utf8",
  );
}

async function main() {
  const [entries, officialTeleferico] = await Promise.all([
    Promise.all(
      Object.entries(sources).map(async ([key, [fileName, variableName]]) => [
        key,
        await fetchLayer(fileName, variableName),
      ]),
    ),
    fetchOfficialTeleferico(),
  ]);
  const layers = Object.fromEntries(entries);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    saveJson(
      "pumakatari-routes.geojson",
      preparePumakatariRoutes(layers.pumakatariRoutes),
    ),
    saveJson(
      "pumakatari-stops.geojson",
      preparePumakatariStops(layers.pumakatariStops),
    ),
    saveJson(
      "teleferico-lines.geojson",
      officialTeleferico.lines,
    ),
    saveJson(
      "teleferico-stations.geojson",
      officialTeleferico.stations,
    ),
  ]);

  console.log("TRANSIT_DATA_OK: capas GeoJSON importadas");
}

main().catch((error) => {
  const cause = error.cause?.message ? ` (${error.cause.message})` : "";
  console.error(`TRANSIT_DATA_ERROR: ${error.message}${cause}`);
  process.exitCode = 1;
});
