import type { NextConfig } from "next";

const desktop = process.env.HABIT_STANDALONE === "1";

const nextConfig: NextConfig = {
  // The desktop app bundles a self-contained server (apps/desktop: `pnpm desktop:build`).
  // Plain `pnpm build` / `pnpm start` keep the normal output.
  output: desktop ? "standalone" : undefined,
  // The desktop server runs from the install folder, which is read-only on macOS and in a Linux AppImage,
  // so it keeps Next's page cache in memory instead of writing it to .next/.
  experimental: desktop ? { isrFlushToDisk: false } : undefined,
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
