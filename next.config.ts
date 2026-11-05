import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets parallel dev servers use separate build dirs (NEXT_DIST_DIR=.next-dealer npm run dev).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
