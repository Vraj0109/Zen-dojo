"use client";

import { useEffect } from "react";

/**
 * Tells the active service worker to cache the offline reader (/offline/read) once units are saved.
 */
export function notifyCacheReader() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "cache-reader" });
    } else {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: "cache-reader" }))
        .catch(() => {});
    }
  }
}

/**
 * Registers the offline-fallback service worker (public/sw.js) in production builds.
 *
 * In dev it does the opposite: a worker installed earlier by `pnpm start` on the same origin (localhost:3000) stays
 * active in the browser and serves `/_next/static/` from its cache first. Dev chunks are not content-hashed, so that
 * cache hands back stale CSS/JS and the dev UI breaks while a production build works. So in dev we unregister any
 * worker on this origin, drop its caches, and reload once so the page is no longer controlled by it.
 */
export function RegisterSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      return;
    }
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length === 0) return;
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((k) => k.startsWith("zd-")).map((k) => caches.delete(k)));
        }
        // Reload once so this page stops being served through the old worker.
        if (navigator.serviceWorker.controller && !sessionStorage.getItem("zd-sw-cleared")) {
          sessionStorage.setItem("zd-sw-cleared", "1");
          window.location.reload();
        }
      } catch {
        // storage or service workers blocked: nothing to clean up
      }
    })();
  }, []);
  return null;
}
