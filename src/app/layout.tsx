import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ubifood | Comida cercana en La Paz",
  description:
    "Ubifood conecta estudiantes, ciudadanos y comercios de La Paz con menus, rutas y ofertas cero desperdicio.",
  applicationName: "UBIFOOD",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#181715",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body
        suppressHydrationWarning
        className="min-h-full bg-[#f7f4ed] text-[#211c18]"
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
