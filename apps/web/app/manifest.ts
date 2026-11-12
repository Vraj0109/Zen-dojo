import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zen Dojo",
    short_name: "Zen Dojo",
    description: "Interview prep: DSA, system design, low-level design and core CS",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1c1715",
    theme_color: "#1c1715",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
