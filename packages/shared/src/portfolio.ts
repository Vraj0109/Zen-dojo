// Portfolio: public-safe summary of progress plus certificates for completed courses.
// Pure logic, no I/O. Never holds notes, code, emails or keys: only a name, numbers, course titles and dates.

export interface CourseProgress {
  id: string;
  title: string;
  kind: "area" | "pattern" | "plan";
  done: number;
  total: number;
  completedOn: string | null;
}

export interface PortfolioBadge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  value: number;
  target: number;
}

export interface PortfolioHeatCell {
  date: string;
  xp: number;
  /** 0 = none, 1-4 = busier */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

export interface PortfolioData {
  name: string;
  level: number;
  xp: number;
  streak: number;
  bestStreak: number;
  totalSolved: number;
  solvedByDifficulty: { easy: number; medium: number; hard: number };
  planWeeksDone: number;
  courses: CourseProgress[];
  generatedOn: string;
  /** Extra profile data (optional so older snapshots still render): */
  activeDays?: number;
  hours?: number;
  /** Problems on the roadmap in total, for the solved ring. */
  totalProblems?: number;
  /** Last 16 weeks of activity, oldest week first, Monday to Sunday. */
  heatmap?: PortfolioHeatCell[][];
  badges?: PortfolioBadge[];
}

export type CourseState = "completed" | "in-progress" | "not-started";

export function courseState(c: CourseProgress): CourseState {
  if (isCourseComplete(c)) return "completed";
  return c.done > 0 ? "in-progress" : "not-started";
}

export function coursePercent(c: CourseProgress): number {
  return c.total > 0 ? Math.min(100, Math.round((c.done / c.total) * 100)) : 0;
}

/** Courses worth showing on a profile: completed first (newest first), then in progress by progress. Not-started ones are left out. */
export function profileCourses(courses: CourseProgress[]): CourseProgress[] {
  const done = courses.filter((c) => courseState(c) === "completed").sort((a, b) => (b.completedOn ?? "").localeCompare(a.completedOn ?? ""));
  const part = courses.filter((c) => courseState(c) === "in-progress").sort((a, b) => coursePercent(b) - coursePercent(a));
  return [...done, ...part];
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * A plain-language summary of the person's work, written from the numbers alone (no AI). Used by the Summarize button
 * instantly, and as the fallback when no AI is available.
 */
export function summarizePortfolio(d: PortfolioData): string {
  const name = cleanPortfolioName(d.name);
  const s = d.solvedByDifficulty;
  const parts: string[] = [];
  parts.push(
    d.totalSolved > 0
      ? `${name} has solved ${plural(d.totalSolved, "problem")} (${s.easy} easy, ${s.medium} medium, ${s.hard} hard)`
      : `${name} is just getting started and has not solved a problem yet`,
  );
  const habit: string[] = [];
  if (d.streak > 0) habit.push(`a current streak of ${plural(d.streak, "day")}`);
  if (d.bestStreak > 0) habit.push(`a best streak of ${plural(d.bestStreak, "day")}`);
  if (d.activeDays && d.activeDays > 0) habit.push(`${plural(d.activeDays, "active day")}`);
  if (d.hours && d.hours > 0) habit.push(`about ${Math.round(d.hours)} hours of focused practice`);
  let text = parts[0] + (habit.length ? `, with ${habit.join(", ")}.` : ".");
  const completed = d.courses.filter((c) => courseState(c) === "completed");
  const partial = d.courses.filter((c) => courseState(c) === "in-progress").sort((a, b) => coursePercent(b) - coursePercent(a));
  if (completed.length) text += ` Completed: ${completed.slice(0, 6).map((c) => c.title).join(", ")}${completed.length > 6 ? `, and ${completed.length - 6} more` : ""}.`;
  if (partial.length) text += ` In progress: ${partial.slice(0, 4).map((c) => `${c.title} (${coursePercent(c)}%)`).join(", ")}${partial.length > 4 ? `, and ${partial.length - 4} more` : ""}.`;
  text += ` Level ${d.level} with ${d.xp.toLocaleString("en-US")} XP`;
  if (d.badges && d.badges.length) text += `, and ${d.badges.filter((b) => b.earned).length} of ${d.badges.length} badges earned`;
  return text + ".";
}

export const PORTFOLIO_NAME_MAX = 60;
export const PORTFOLIO_DEFAULT_NAME = "Learner";

/** A course is complete when everything in it is done (and it has something in it). */
export function isCourseComplete(c: CourseProgress): boolean {
  return c.total > 0 && c.done >= c.total;
}

/** Courses that earn a certificate: complete and with a known completion date. */
export function certificateCourses(courses: CourseProgress[]): CourseProgress[] {
  return courses.filter((c) => isCourseComplete(c) && !!c.completedOn);
}

/** Display name: control characters stripped, trimmed, capped; falls back to "Learner". */
export function cleanPortfolioName(raw: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex
  const s = (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, PORTFOLIO_NAME_MAX);
  return s || PORTFOLIO_DEFAULT_NAME;
}

function fnv(text: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Deterministic 12-character uppercase hex id (two 32-bit FNV mixes). Not a signature: a reference number only. */
export function certificateId(name: string, courseId: string, completedOn: string): string {
  const text = `${name}\u0000${courseId}\u0000${completedOn}`;
  const a = fnv(text, 0x811c9dc5);
  const b = fnv(text + "\u0001", a ^ 0x9e3779b9);
  return (a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0")).slice(0, 12).toUpperCase();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Long date such as "11 November 2026" from a local YYYY-MM-DD string (no Date parsing, so no timezone shift). */
export function longDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const month = names[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : ymd;
}

/** Self-contained web page for the portfolio: inline CSS, no scripts, no external requests. Everything is escaped. */
export function renderPortfolioHtml(d: PortfolioData): string {
  const e = escapeHtml;
  const num = (n: number) => String(Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));
  const name = e(cleanPortfolioName(d.name));
  const tile = (label: string, value: string, hint = "") =>
    `<div class="tile"><p class="l">${e(label)}</p><p class="v">${e(value)}</p>${hint ? `<p class="h">${e(hint)}</p>` : ""}</div>`;
  const rows = d.courses
    .map((c) => {
      const pct = c.total > 0 ? Math.min(100, Math.round((c.done / c.total) * 100)) : 0;
      const done = isCourseComplete(c);
      return `<li><div class="row"><span>${e(c.title)}</span><span class="m">${num(c.done)} / ${num(c.total)}${done && c.completedOn ? `, completed ${e(longDate(c.completedOn))}` : ""}</span></div><div class="bar"><i style="width:${pct}%"></i></div></li>`;
    })
    .join("");
  const certs = certificateCourses(d.courses)
    .map((c) => `<li>${e(c.title)}, completed ${e(longDate(c.completedOn!))} <span class="m">(certificate ${e(certificateId(cleanPortfolioName(d.name), c.id, c.completedOn!))})</span></li>`)
    .join("");
  const s = d.solvedByDifficulty;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} - Zen Dojo portfolio</title>
<style>
body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#faf9f6;color:#1d1d1b}
main{max-width:56rem;margin:0 auto;padding:2rem 1rem}
h1{margin:0 0 .25rem;font-size:1.75rem}h2{margin:2rem 0 .75rem;font-size:1.2rem}
.sub,.m,.h,.l{color:#5f5e58}.sub{margin:0}
.sum{margin:1rem 0 0;padding:.9rem 1rem;border:1px solid #d9d6cc;border-radius:.75rem;background:#fff}
.badges{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.5rem}.badges li{margin:0;border:1px solid #d9d6cc;border-radius:.6rem;padding:.5rem .75rem;background:#fff}.badges li.on{border-color:#2f6f5e}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(10rem,1fr));gap:.75rem}
.tile{border:1px solid #d9d6cc;border-radius:.75rem;background:#fff;padding:.75rem 1rem}
.tile p{margin:0}.l{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}.v{font-size:1.25rem;font-weight:600}.h{font-size:.8rem}
ul{list-style:none;margin:0;padding:0}li{margin:0 0 .9rem}
.row{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.bar{height:.4rem;border-radius:99px;background:#e6e3d9;overflow:hidden;margin-top:.25rem}.bar i{display:block;height:100%;background:#2f6f5e}
footer{margin-top:2rem;font-size:.85rem;color:#5f5e58}
</style></head><body><main>
<h1>${name}</h1>
<p class="sub">Interview-prep progress from Zen Dojo, generated ${e(longDate(d.generatedOn))}</p>
<p class="sum">${e(summarizePortfolio(d))}</p>
<h2>Progress</h2>
<div class="grid">
${tile("Current streak", `${num(d.streak)} day${d.streak === 1 ? "" : "s"}`, `best ${num(d.bestStreak)}`)}
${tile("Problems solved", num(d.totalSolved), `${num(s.easy)} easy, ${num(s.medium)} medium, ${num(s.hard)} hard`)}
${tile("Level", num(d.level), `${num(d.xp)} XP`)}
${tile("Plan weeks done", `${num(d.planWeeksDone)} / 16`)}
${d.activeDays !== undefined ? tile("Active days", num(d.activeDays)) : ""}
${d.hours !== undefined ? tile("Focused hours", num(d.hours)) : ""}
</div>
<h2>Courses</h2>
<ul>${rows || "<li class=\"m\">No courses yet.</li>"}</ul>
${d.badges && d.badges.length ? `<h2>Badges (${num(d.badges.filter((b) => b.earned).length)} of ${num(d.badges.length)} earned)</h2><ul class="badges">${d.badges.map((b) => `<li class="${b.earned ? "on" : ""}">${e(b.title)}<br><span class="m">${b.earned ? "Earned" : `${num(b.value)} / ${num(b.target)}`}</span></li>`).join("")}</ul>` : ""}
<h2>Certificates</h2>
<ul>${certs || "<li class=\"m\">No completed courses yet.</li>"}</ul>
<footer>Made with Zen Dojo. Certificate numbers are reference codes, not signatures.</footer>
</main></body></html>
`;
}
