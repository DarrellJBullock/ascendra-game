import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output produces a minimal self-contained server bundle
  // (server.js + only the deps actually used) for the production Docker
  // image — see frontend/Dockerfile.
  output: "standalone",
};

export default nextConfig;
