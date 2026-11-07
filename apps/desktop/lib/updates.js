// @ts-check
// Pure helpers for updates and pre-update backups. No Electron imports, so they're unit-tested (updates.test.ts).

/** Where releases are published (electron-builder.yml → publish). */
export const RELEASES_REPO = "Vraj0109/habit-manager";

/** How often a running app checks for a new release. */
export const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

/** Pre-update database backups kept in the data folder's backups/; older ones are deleted. */
export const KEEP_BACKUPS = 5;

/**
 * @param {string} v e.g. "v1.2.3" or "1.2.3-beta.1"
 * @returns {{ nums: number[], pre: string }}
 */
function parse(v) {
  const [core, pre = ""] = v.trim().replace(/^v/i, "").split("-", 2);
  const nums = core.split(".").map((n) => Number.parseInt(n, 10) || 0);
  while (nums.length < 3) nums.push(0);
  return { nums, pre };
}

/**
 * True if `candidate` is a newer version than `current` (semver order; a prerelease is older than its release).
 * @param {string} candidate
 * @param {string} current
 */
export function isNewer(candidate, current) {
  const a = parse(candidate);
  const b = parse(current);
  for (let i = 0; i < 3; i++) if (a.nums[i] !== b.nums[i]) return a.nums[i] > b.nums[i];
  if (a.pre === b.pre) return false;
  if (!a.pre) return true; // 1.2.0 > 1.2.0-beta
  if (!b.pre) return false;
  return a.pre > b.pre;
}

/**
 * The app version changed since the last run (an update, or a downgrade): back up before the new
 * version's migrations touch the database. Not on the very first run.
 * @param {string | null} lastRunVersion
 * @param {string} currentVersion
 */
export function needsBackup(lastRunVersion, currentVersion) {
  return lastRunVersion !== null && lastRunVersion.trim() !== "" && lastRunVersion.trim() !== currentVersion;
}

/**
 * @param {string} fromVersion version that last used the database
 * @param {string} toVersion version about to start
 * @param {Date} now
 */
export function backupName(fromVersion, toVersion, now) {
  const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `habit-v${fromVersion}-to-v${toVersion}-${stamp}.db`;
}

/**
 * Names of backups to delete so only the newest `keep` remain. Only touches files this app created.
 * @param {string[]} names
 * @param {number} [keep]
 */
export function backupsToPrune(names, keep = KEEP_BACKUPS) {
  const ours = names.filter((n) => /^habit-v.+-to-v.+-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/.test(n)).sort();
  return ours.slice(0, Math.max(0, ours.length - keep));
}
