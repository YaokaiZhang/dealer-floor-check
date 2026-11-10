import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets parallel dev servers use separate build dirs (NEXT_DIST_DIR=.next-dealer npm run dev).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Private LAN ranges, so phones on the same network (incl. an iPhone hotspot, 172.20.10.x) get hot reload.
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
