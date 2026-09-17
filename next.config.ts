import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded from node_modules at runtime instead of being bundled
  serverExternalPackages: ["exceljs"],
  // Opening the dev server from a phone on the local network or through a Cloudflare tunnel
  allowedDevOrigins: ["127.0.0.1", "192.168.0.19", "*.trycloudflare.com"],
  experimental: {
    serverActions: {
      // Student import files go through a server action (default limit is 1 MB).
      // Large uploads (materials, images) use /api/uploads instead.
      bodySizeLimit: "6mb",
      // Temporary public link through a Cloudflare quick tunnel
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
  async headers() {
    return [
      {
        // The code editor (~4 MB): download once, then reuse from the browser cache
        source: "/monaco/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
