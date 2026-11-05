import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Narrow, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const body = Archivo({ variable: "--font-body", subsets: ["latin"] });
const display = Archivo_Narrow({ variable: "--font-display-face", subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Aurora Floor Check",
  description: "Data-first floor checks for dealer inventory finance. Fictional prototype.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
