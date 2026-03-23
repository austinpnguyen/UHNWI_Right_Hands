import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error type missing
    turbopack: {
      root: process.cwd(),
    },
  },
};

export default nextConfig;
