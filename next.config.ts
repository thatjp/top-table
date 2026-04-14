import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/venues", destination: "/tables", permanent: true },
      { source: "/venues/:placeId", destination: "/tables/:placeId", permanent: true },
    ];
  },
};

export default nextConfig;
