import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // STANDALONE=1 (Docker / Render) emits a minimal server bundle: smaller image, faster cold starts.
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  compress: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
