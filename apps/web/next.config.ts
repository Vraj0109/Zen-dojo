import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared package ships TypeScript source.
  transpilePackages: ["@habit/shared"],
  cacheComponents: true,
  partialPrefetching: true,
  // Old URLs from before Stats and Settings moved under Profile.
  async redirects() {
    return [
      { source: "/stats", destination: "/profile", permanent: false },
      { source: "/settings", destination: "/profile/settings", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
