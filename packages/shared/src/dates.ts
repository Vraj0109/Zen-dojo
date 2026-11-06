// Dates are plain "YYYY-MM-DD" strings in the user's local time, so day math never
// drifts with time zones or DST.

export function toLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parse(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string): string {
  const dow = parse(date).getDay(); // 0 = Sunday
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function isWeekend(date: string): boolean {
  const dow = parse(date).getDay();
  return dow === 0 || dow === 6;
}

/** 1-based plan week for `date`; < 1 before the plan starts. */
export function planWeekNumber(planStart: string, date: string): number {
  return Math.floor(daysBetween(planStart, date) / 7) + 1;
}

export function formatLong(date: string): string {
  return parse(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}
