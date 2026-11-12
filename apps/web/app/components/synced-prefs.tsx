"use client";

import { useEffect } from "react";
import { getSyncedPrefsAction, setSyncedPrefsAction } from "../actions";
import {
  RELOAD_FLAG_KEY,
  SYNCED_AT_KEY,
  applyValues,
  buildSnapshot,
  parseSyncedPrefs,
  reloadDecision,
  sameValues,
  serializeSyncedPrefs,
  shouldPull,
} from "@/lib/synced-prefs";

/** Keeps the allowlisted browser preferences in step across devices. No UI; newest wins. */
export function SyncedPrefs() {
  useEffect(() => {
    let lastPushed: Record<string, string> | null = null;
    let busy = false;

    const localAt = (): number => {
      try {
        return Number(localStorage.getItem(SYNCED_AT_KEY)) || 0;
      } catch {
        return 0;
      }
    };
    const remember = (at: number) => {
      try {
        localStorage.setItem(SYNCED_AT_KEY, String(at));
      } catch {
        // blocked
      }
    };

    async function pull() {
      try {
        const server = parseSyncedPrefs(await getSyncedPrefsAction());
        if (!server) return;
        if (!shouldPull(server, localAt())) {
          if (lastPushed === null) lastPushed = buildSnapshot(localStorage);
          return;
        }
        const changed = applyValues(localStorage, server.values);
        remember(server.updatedAt);
        lastPushed = buildSnapshot(localStorage);
        let flagSet = false;
        try {
          flagSet = sessionStorage.getItem(RELOAD_FLAG_KEY) === "1";
        } catch {
          flagSet = true; // cannot guard against a loop, so never reload
        }
        const d = reloadDecision(changed, flagSet);
        try {
          if (d.flag) sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
          else sessionStorage.removeItem(RELOAD_FLAG_KEY);
        } catch {
          // blocked
        }
        if (d.reload) location.reload();
      } catch {
        // offline or signed out
      }
    }

    async function push() {
      if (busy) return;
      busy = true;
      try {
        const snap = buildSnapshot(localStorage);
        if (Object.keys(snap).length === 0 || sameValues(snap, lastPushed)) return;
        const at = Date.now();
        const json = serializeSyncedPrefs(at, snap);
        if (!json) return;
        await setSyncedPrefsAction(json);
        lastPushed = snap;
        remember(at);
      } catch {
        // try again next time
      } finally {
        busy = false;
      }
    }

    void pull().then(() => push());
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
      else void push();
    };
    const onHide = () => void push();
    const timer = window.setInterval(() => void push(), 20_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);
  return null;
}
