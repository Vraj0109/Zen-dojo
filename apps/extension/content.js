// @ts-check
// Runs on leetcode.com pages only. Calls LeetCode's API from the page (so your existing login is used;
// the extension never reads or stores your password or cookies) and hands results to background.js,
// which forwards them to your local HabitManager app.

(async () => {
  /** @type {typeof import("./lib/sync.js")} */
  const sync = await import(chrome.runtime.getURL("lib/sync.js"));
  /** @type {typeof import("./lib/leetcode.js")} */
  const lc = await import(chrome.runtime.getURL("lib/leetcode.js"));

  const RECENT_EVERY_MS = 10 * 60 * 1000;

  const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

  /** csrftoken is a readable cookie; LeetCode expects it echoed in a header on POSTs. */
  const csrf = () => /(?:^|;\s*)csrftoken=([^;]+)/.exec(document.cookie)?.[1] ?? "";

  /** @param {string} query @param {Record<string, unknown>} [variables] */
  async function gql(query, variables = {}) {
    const res = await fetch("/graphql/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "x-csrftoken": csrf() },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw Object.assign(new Error(`LeetCode returned HTTP ${res.status}`), { status: res.status });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "LeetCode returned an error");
    return json.data;
  }

  /** Ask background.js to call the local app. @param {"GET" | "POST"} method @param {string} path @param {unknown} [body] */
  async function callApp(method, path, body) {
    /** @type {{ ok: boolean, data?: any, error?: string }} */
    const r = await chrome.runtime.sendMessage({ type: "app", method, path, body });
    if (!r?.ok) throw new Error(r?.error ?? "HabitManager app did not respond");
    return r.data;
  }

  /** @type {import("./lib/sync.js").Deps} */
  const deps = {
    gql,
    sleep,
    app: {
      state: async () => callApp("GET", "/api/ext/known"),
      send: async (submissions, topics = []) => callApp("POST", "/api/ext/submissions", { submissions, topics }),
    },
  };

  /** @param {Record<string, unknown>} patch */
  const setStatus = (patch) => chrome.storage.local.set(patch);

  async function configured() {
    const { token } = await chrome.storage.local.get("token");
    return Boolean(token);
  }

  // --- Live capture: after you submit, LeetCode shows /problems/<slug>/submissions/<id>/ ---
  let lastSeen = "";
  async function checkUrl() {
    const id = lc.submissionIdFromPath(location.pathname);
    if (!id || id === lastSeen) return;
    lastSeen = id;
    if (!(await configured())) return;
    try {
      const r = await sync.captureSubmission(deps, id);
      if (r) await setStatus({ lastCapture: { at: Date.now(), id, ...r } });
    } catch (e) {
      await setStatus({ lastError: { at: Date.now(), message: String(/** @type {any} */ (e)?.message ?? e) } });
    }
  }
  setInterval(checkUrl, 1500); // LeetCode is a single-page app; watch for URL changes
  checkUrl();

  // --- Catch-up: your 20 most recent accepted submissions, at most every 10 minutes across tabs ---
  async function maybeSyncRecent() {
    if (!(await configured())) return;
    const { lastRecentAt = 0 } = await chrome.storage.local.get("lastRecentAt");
    if (Date.now() - Number(lastRecentAt) < RECENT_EVERY_MS) return;
    await setStatus({ lastRecentAt: Date.now() });
    try {
      const r = await sync.syncRecent(deps);
      if (r.stored) await setStatus({ lastCapture: { at: Date.now(), ...r } });
    } catch (e) {
      await setStatus({ lastError: { at: Date.now(), message: String(/** @type {any} */ (e)?.message ?? e) } });
    }
  }
  maybeSyncRecent();

  // --- Full history import, started from the popup ---
  let backfilling = false;
  /** @param {boolean} full */
  async function runBackfill(full) {
    if (backfilling) return;
    backfilling = true;
    const { lastBackfillAt = 0 } = await chrome.storage.local.get("lastBackfillAt");
    const startedAt = Date.now();
    await setStatus({ backfill: { running: true, startedAt, phase: "Starting", done: 0, total: 0, stored: 0 } });
    try {
      // A day of overlap so nothing submitted during the last run is missed.
      const since = full ? 0 : Math.max(0, Number(lastBackfillAt) - 24 * 60 * 60 * 1000);
      const totals = await sync.backfill({ ...deps, onProgress: (p) => setStatus({ backfill: { running: true, startedAt, ...p } }) }, { since, all: full });
      await setStatus({ lastBackfillAt: startedAt, backfill: { running: false, startedAt, finishedAt: Date.now(), ...totals } });
    } catch (e) {
      await setStatus({ backfill: { running: false, startedAt, error: String(/** @type {any} */ (e)?.message ?? e) } });
    } finally {
      backfilling = false;
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "backfill") {
      runBackfill(Boolean(msg.full));
      sendResponse({ ok: true });
    }
  });
})();
