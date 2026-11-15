"use client";

import { useEffect } from "react";
import { getSyncAccountStateAction, getSyncedPrefsAction, setSyncedPrefsAction } from "../actions";
import {
  KNOWN_PREFS_KEY,
  PREFS_APPLIED_EVENT,
  RELOAD_FLAG_KEY,
  RELOAD_PREF_KEYS,
  applyValues,
  buildSnapshot,
  dirtyValues,
  parseKnown,
  parseSyncedPrefs,
  planPull,
  reloadDecision,
  serializeSyncedPrefs,
  type KnownPrefs,
} from "@/lib/synced-prefs";
import { SYNC_PULLED_EVENT } from "@/lib/sync-manager";

/**
 * Keeps the allowlisted browser preferences in step across devices. No UI. Per key: a pulled value is taken when its
 * stamp differs from the one this device last synced; a push sends only the keys changed here (plan 0075).
 * Guests on the hosted site skip the server.
 */
export function SyncedPrefs() {
  useEffect(() => {
    let busy = false;
    let guest: boolean | null = null;

    const readKnown = (): KnownPrefs => {
      try {
        return parseKnown(localStorage.getItem(KNOWN_PREFS_KEY));
      } catch {
        return {};
      }
    };
    const writeKnown = (k: KnownPrefs) => {
      try {
        localStorage.setItem(KNOWN_PREFS_KEY, JSON.stringify(k));
      } catch {
        // blocked
      }
    };
    const isGuest = async () => {
      if (guest === null) guest = (await getSyncAccountStateAction()) === "guest";
      return guest;
    };

    async function pull() {
      try {
        if (await isGuest()) return;
        const server = parseSyncedPrefs(await getSyncedPrefsAction());
        if (!server) return;
        const plan = planPull(server, readKnown(), buildSnapshot(localStorage));
        writeKnown(plan.known);
        if (Object.keys(plan.apply).length === 0) return;
        const changed = applyValues(localStorage, plan.apply);
        if (!changed) return;
        window.dispatchEvent(new Event(PREFS_APPLIED_EVENT));
        const needsReload = Object.keys(plan.apply).some((k) => RELOAD_PREF_KEYS.includes(k));
        let flagSet = false;
        try {
          flagSet = sessionStorage.getItem(RELOAD_FLAG_KEY) === "1";
        } catch {
          flagSet = true; // cannot guard against a loop, so never reload
        }
        const d = reloadDecision(needsReload, flagSet);
        try {
          if (d.flag) sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
        } catch {
          // blocked
        }
        if (d.reload) location.reload();
      } catch {
        // offline
      }
    }

    async function push() {
      if (busy) return;
      busy = true;
      try {
        if (await isGuest()) return;
        const known = readKnown();
        const dirty = dirtyValues(buildSnapshot(localStorage), known);
        const keys = Object.keys(dirty);
        if (keys.length === 0) return;
        const at = Date.now();
        const stamps = Object.fromEntries(keys.map((k) => [k, at]));
        const json = serializeSyncedPrefs(at, dirty, stamps);
        if (!json) return;
        const r = await setSyncedPrefsAction(json);
        if (!r.ok) return;
        const next = { ...known };
        for (const k of keys) next[k] = { v: dirty[k], s: at };
        writeKnown(next);
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
    const onPulled = () => void pull();
    const timer = window.setInterval(() => void push(), 20_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", onHide);
    window.addEventListener(SYNC_PULLED_EVENT, onPulled);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener(SYNC_PULLED_EVENT, onPulled);
    };
  }, []);
  return null;
}
