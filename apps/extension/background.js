// @ts-check
// Service worker: the only part that talks to your local HabitManager app. Content scripts on
// leetcode.com send it { type: "app" } messages; the popup sends "test" and "start-backfill".

import { DEFAULT_APP_URL, normalizeAppUrl } from "./lib/config.js";

const PATHS = new Set(["/api/ext/known", "/api/ext/submissions", "/api/ext/time"]);

/** @param {{ method: "GET" | "POST", path: string, body?: unknown }} req */
async function callApp({ method, path, body }) {
  if (!PATHS.has(path) || (method !== "GET" && method !== "POST")) return { ok: false, error: "Not allowed" };
  const { appUrl = DEFAULT_APP_URL, token = "" } = await chrome.storage.local.get(["appUrl", "token"]);
  if (!token) return { ok: false, error: "Paste the pairing key from HabitManager (Profile → Settings) into the extension." };
  const origin = normalizeAppUrl(String(appUrl));
  if (!origin) return { ok: false, error: "App URL must be http://localhost:<port> or http://127.0.0.1:<port>." };
  try {
    const res = await fetch(origin + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? `App returned HTTP ${res.status}` };
    return { ok: true, data };
  } catch {
    return { ok: false, error: `Can't reach HabitManager at ${origin}. Is it running (pnpm start)?` };
  }
}

/** Open (or reuse) a leetcode.com tab and tell its content script to import your history. */
async function startBackfill(/** @type {boolean} */ full) {
  let [tab] = await chrome.tabs.query({ url: "https://leetcode.com/*" });
  tab ??= await chrome.tabs.create({ url: "https://leetcode.com/problemset/", active: false });
  if (tab.id === undefined) return { ok: false, error: "Could not open leetcode.com" };
  // The content script needs a moment to load in a new tab.
  for (let i = 0; i < 30; i++) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "backfill", full });
      return { ok: true };
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return { ok: false, error: "The leetcode.com tab didn't respond. Reload it and try again." };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (msg?.type === "app") callApp(msg).then(sendResponse);
  else if (msg?.type === "test") callApp({ method: "GET", path: "/api/ext/known" }).then(sendResponse);
  else if (msg?.type === "start-backfill") startBackfill(Boolean(msg.full)).then(sendResponse);
  else return;
  return true; // respond asynchronously
});
