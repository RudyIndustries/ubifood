import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ubifood | Comida cercana en La Paz",
  description:
    "Ubifood conecta estudiantes, ciudadanos y comercios de La Paz con menus, rutas y ofertas cero desperdicio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-[#f7f4ed] text-[#211c18]">{children}</body>
    </html>
  );
}
