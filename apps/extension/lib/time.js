// @ts-check
// Time on LeetCode problem pages. Pure helpers: content.js feeds them the clock and the page state, and sends what the
// ledger drains to your local app. Only a problem's slug and a number of seconds ever leave the page.

export const TICK_MS = 5000;
/** No mouse, key or scroll for this long counts as away. */
export const IDLE_MS = 60_000;
export const FLUSH_MS = 60_000;
/** A gap longer than this between ticks (sleep, throttled tab) is not credited. */
export const MAX_GAP_MS = 15_000;

/** "/problems/two-sum/description/" -> "two-sum"; null for any other page. */
export function slugFromPath(/** @type {string} */ pathname) {
  return /^\/problems\/([a-z0-9-]+)(?:\/|$)/.exec(pathname)?.[1] ?? null;
}

/** Local date as YYYY-MM-DD (the app also uses local days). */
export function localDay(/** @type {Date} */ d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Seconds to credit for the time since the last tick: the gap while the page was active, nothing if it was not or the
 * gap is too long to trust.
 * @param {number} prevTick ms @param {number} now ms @param {boolean} active
 */
export function creditSeconds(prevTick, now, active) {
  const gap = now - prevTick;
  if (!active || gap <= 0 || gap > MAX_GAP_MS) return 0;
  return gap / 1000;
}

/** Whether the person is really on the page: tab visible and focused, and some input in the last IDLE_MS. */
export function isActive(/** @type {{ visible: boolean, focused: boolean, lastInput: number, now: number }} */ s) {
  return s.visible && s.focused && s.now - s.lastInput < IDLE_MS;
}

/** Collects seconds per (day, slug); `drain` hands back whole seconds and keeps the fraction. */
export class Ledger {
  /** @type {Map<string, number>} */
  #seconds = new Map();

  add(/** @type {string} */ day, /** @type {string} */ slug, /** @type {number} */ seconds) {
    if (seconds <= 0) return;
    const key = `${day}|${slug}`;
    this.#seconds.set(key, (this.#seconds.get(key) ?? 0) + seconds);
  }

  /** @returns {{ day: string, slug: string, seconds: number }[]} */
  drain() {
    /** @type {{ day: string, slug: string, seconds: number }[]} */
    const out = [];
    for (const [key, total] of [...this.#seconds]) {
      const whole = Math.floor(total);
      if (whole < 1) continue;
      const [day, slug] = key.split("|");
      out.push({ day, slug, seconds: whole });
      this.#seconds.set(key, total - whole);
    }
    return out;
  }

  /** Put entries back after a failed send so the time isn't lost. */
  restore(/** @type {{ day: string, slug: string, seconds: number }[]} */ entries) {
    for (const e of entries) this.add(e.day, e.slug, e.seconds);
  }
}
