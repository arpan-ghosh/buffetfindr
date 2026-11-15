import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The restaurants API falls back to these JSON files when the database is unavailable.
  outputFileTracingIncludes: {
    "/api/restaurants": ["./data/*.json"],
    "/buffets/[region]": ["./data/*_buffets.json"],
    "/restaurant/[place_id]": ["./data/*_buffets.json"],
    "/sitemap.xml": ["./data/*_buffets.json"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "places.googleapis.com" },
    ],
  },
};

export default nextConfig;
