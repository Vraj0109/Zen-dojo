// @ts-check
import { DEFAULT_APP_URL, normalizeAppUrl } from "./lib/config.js";

const $ = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));
const appUrl = /** @type {HTMLInputElement} */ ($("appUrl"));
const token = /** @type {HTMLInputElement} */ ($("token"));
const backfillBtn = /** @type {HTMLButtonElement} */ ($("backfill"));
const fullBtn = /** @type {HTMLButtonElement} */ ($("full"));

const ago = (/** @type {number} */ ms) => {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

/** @param {HTMLElement} el @param {string} text @param {"ok" | "err" | "muted"} [cls] */
function show(el, text, cls = "muted") {
  el.textContent = text;
  el.className = cls;
}

async function test() {
  show($("conn"), "Checking…");
  /** @type {{ ok: boolean, data?: { known: string[] }, error?: string }} */
  const r = await chrome.runtime.sendMessage({ type: "test" });
  if (r?.ok) show($("conn"), `✓ Connected. ${r.data?.known.length ?? 0} submissions stored in the app.`, "ok");
  else show($("conn"), r?.error ?? "No response", "err");
}

$("settings").addEventListener("submit", async (e) => {
  e.preventDefault();
  const origin = normalizeAppUrl(appUrl.value);
  if (!origin) return show($("conn"), "Use http://localhost:<port> or http://127.0.0.1:<port>.", "err");
  appUrl.value = origin;
  await chrome.storage.local.set({ appUrl: origin, token: token.value.trim() });
  await test();
});

async function start(/** @type {boolean} */ full) {
  backfillBtn.disabled = fullBtn.disabled = true;
  show($("progress"), "Opening leetcode.com…");
  const r = await chrome.runtime.sendMessage({ type: "start-backfill", full });
  if (!r?.ok) {
    show($("progress"), r?.error ?? "Could not start", "err");
    backfillBtn.disabled = fullBtn.disabled = false;
  }
}
backfillBtn.addEventListener("click", () => start(false));
fullBtn.addEventListener("click", () => start(true));

/** @param {Record<string, any>} s */
function render(s) {
  const b = s.backfill;
  const running = Boolean(b?.running) && Date.now() - b.startedAt < 6 * 60 * 60 * 1000;
  backfillBtn.disabled = fullBtn.disabled = running;
  if (!b) show($("progress"), s.lastBackfillAt ? "" : "Not imported yet.");
  else if (running) show($("progress"), `${b.phase}… ${b.total ? `${b.done}/${b.total} problems, ` : ""}${b.stored} submissions saved`);
  else if (b.error) show($("progress"), `Stopped: ${b.error}`, "err");
  else if (b.finishedAt)
    show($("progress"), `✓ Done ${ago(b.finishedAt)}: ${b.questions} problems checked, ${b.stored} submissions saved, ${b.added} new solves.`, "ok");

  const parts = [];
  if (s.lastCapture) parts.push(`Last sent ${ago(s.lastCapture.at)}: ${s.lastCapture.stored} submission(s).`);
  if (s.lastError && (!s.lastCapture || s.lastError.at > s.lastCapture.at)) parts.push(`Last error ${ago(s.lastError.at)}: ${s.lastError.message}`);
  show($("last"), parts.join(" ") || "Nothing captured yet.");
}

const trackTime = /** @type {HTMLInputElement} */ ($("trackTime"));
trackTime.addEventListener("change", () => chrome.storage.local.set({ trackTime: trackTime.checked }));

(async () => {
  const s = await chrome.storage.local.get(null);
  trackTime.checked = s.trackTime !== false;
  appUrl.value = String(s.appUrl ?? DEFAULT_APP_URL);
  token.value = String(s.token ?? "");
  render(s);
  if (s.token) test();
  chrome.storage.onChanged.addListener(async () => render(await chrome.storage.local.get(null)));
})();
