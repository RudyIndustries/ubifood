import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UBIFOOD - Comida y rutas en La Paz",
    short_name: "UBIFOOD",
    description:
      "Restaurantes, menus, ofertas Crazy Hour y rutas de transporte en La Paz.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ed",
    theme_color: "#181715",
    orientation: "portrait-primary",
    categories: ["food", "navigation", "travel"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
