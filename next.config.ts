import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
