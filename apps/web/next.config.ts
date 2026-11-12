import type { NextConfig } from "next";

const desktop = process.env.HABIT_STANDALONE === "1";
const hosted = process.env.HABIT_HOSTED === "1";

const nextConfig: NextConfig = {
  // The desktop app bundles a self-contained server (apps/desktop: `pnpm desktop:build`).
  // Plain `pnpm build` / `pnpm start` keep the normal output.
  output: desktop ? "standalone" : undefined,
  // The desktop server runs from the install folder, which is read-only on macOS and in a Linux AppImage,
  // so it keeps Next's page cache in memory instead of writing it to .next/.
  experimental: desktop ? { isrFlushToDisk: false } : undefined,
  // Shared package ships TypeScript source.
  transpilePackages: ["@habit/shared"],
  // The cp-algorithms articles are read from disk at request time; make sure the standalone build ships them.
  outputFileTracingIncludes: { "/dsa/pattern/[id]": ["./content/cp-algorithms/**/*"] },
  // Off on the hosted Cloudflare build: OpenNext's Workers runtime cannot run Cache Components (setTimeout), and the
  // pages hang. Nothing here uses "use cache"; pages are rendered per request there.
  cacheComponents: hosted ? false : true,
  partialPrefetching: hosted ? false : true,
  // Old URLs from before Stats and Settings moved under Profile.
  async redirects() {
    return [
      { source: "/stats", destination: "/profile", permanent: false },
      { source: "/settings", destination: "/profile/settings", permanent: false },
      // CSES problems moved into the main DSA list.
      { source: "/dsa/cses", destination: "/dsa", permanent: false },
      { source: "/dsa/cses/:id", destination: "/dsa/:id", permanent: false },
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
