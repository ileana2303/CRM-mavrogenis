import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Client router cache: a dynamic page visited in the last 60 s (e.g. «Πίσω» from equipment to the hub)
  // is shown instantly instead of re-rendering + re-calling SoftOne. Save actions call revalidatePath,
  // which clears this cache, so the user's own changes are always visible.
  experimental: { staleTimes: { dynamic: 60 } },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
