"use client";

import { useEffect } from "react";

/** Registers the offline-fallback service worker (public/sw.js). Production only: in dev it would cache stale code. */
export function RegisterSw() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
