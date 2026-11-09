import { rng } from "./design";
import type { StressCase, Ty } from "./types";

// Large inputs for pack problems, written as data instead of code. A pack problem lists generators per parameter, for
// example { "label": "100000 numbers", "gen": { "nums": { "kind": "ints", "n": 100000, "min": -1000, "max": 1000, "seed": 1 },
// "target": { "kind": "value", "value": 7 } } }. This file checks them and turns them into inputs. Every input is built
// from a fixed seed, so it is the same on every run. The expected answers come from the pack's C++ solution (lib/judge/run.ts).

export type Gen =
  /** A fixed value, for a scalar parameter such as target */
  | { kind: "value"; value: unknown }
  /** n random integers between min and max; order "asc" or "desc" sorts them */
  | { kind: "ints"; n: number; min: number; max: number; seed?: number; order?: "asc" | "desc" }
  /** n, n+1, ... : start (default 0), n values; reversed when order is "desc" */
  | { kind: "range"; n: number; start?: number; order?: "asc" | "desc" }
  /** The numbers 1 to n in a random order */
  | { kind: "perm"; n: number; seed?: number }
  /** n copies of value (for a string parameter: the text repeated n times) */
  | { kind: "repeat"; value: unknown; n: number }
  /** A random string of n letters from alphabet; with count, a list of count such strings */
  | { kind: "string"; n: number; alphabet: string; seed?: number; count?: number }
  /** rows lists of cols random integers between min and max */
  | { kind: "grid"; rows: number; cols: number; min: number; max: number; seed?: number };

export interface PackStress {
  label: string;
  /** Milliseconds allowed in C++ (Java gets 3 times as long, JavaScript 5 times). Default 1500. */
  limitMs?: number;
  /** One generator per parameter, by parameter name (or one generator when the function has a single parameter) */
  gen: Record<string, Gen>;
}

export const STRESS_LIMITS = { cases: 5, size: 1_000_000, alphabet: 62 } as const;

const KINDS = ["value", "ints", "range", "perm", "repeat", "string", "grid"] as const;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && Math.abs(v) <= Number.MAX_SAFE_INTEGER;
const depth = (t: Ty) => (t.match(/\[\]/g) ?? []).length;

/** Is `gen` a generator object (and not a map from parameter names to generators)? */
const isGen = (v: unknown): v is Record<string, unknown> => isObj(v) && typeof v.kind === "string";

/** Problems with one generator, in plain words ([] when it is fine). `matches` checks a fixed value against a type. */
export function checkGen(g: unknown, ty: Ty, where: string, matches: (v: unknown, t: Ty) => boolean): string[] {
  if (!isGen(g) || !(KINDS as readonly string[]).includes(String(g.kind))) return [`${where}: "kind" must be one of ${KINDS.join(", ")}.`];
  const errs: string[] = [];
  const size = (k: string) => {
    if (!isInt(g[k]) || (g[k] as number) < 0 || (g[k] as number) > STRESS_LIMITS.size) errs.push(`${where}.${k} must be a whole number from 0 to ${STRESS_LIMITS.size}.`);
  };
  const num = (k: string) => {
    if (!isInt(g[k])) errs.push(`${where}.${k} must be a whole number.`);
  };
  const intTy = (t: Ty) => t === "int[]" || t === "long[]";
  const bound = (lo: unknown, hi: unknown) => {
    if (isInt(lo) && isInt(hi) && lo > hi) errs.push(`${where}: min must not be more than max.`);
    if (ty === "int[]" || ty === "int[][]") for (const v of [lo, hi]) if (isInt(v) && Math.abs(v) > 2147483648) errs.push(`${where}: values for an ${ty} parameter must fit in 32 bits.`);
  };
  switch (g.kind) {
    case "value":
      if (!("value" in g) || !matches(g.value, ty)) errs.push(`${where}.value is not a valid ${ty}.`);
      break;
    case "ints":
    case "range":
    case "perm":
      if (!intTy(ty)) errs.push(`${where}: "${g.kind}" makes a list of numbers, but this parameter is ${ty}.`);
      size("n");
      if (g.kind === "ints") {
        num("min");
        num("max");
        bound(g.min, g.max);
      }
      if (g.kind === "range" && g.start !== undefined) num("start");
      if (g.kind === "ints" || g.kind === "range") if (g.order !== undefined && g.order !== "asc" && g.order !== "desc") errs.push(`${where}.order must be "asc" or "desc".`);
      break;
    case "repeat": {
      size("n");
      const isText = ty === "string";
      if (!(isText ? typeof g.value === "string" : depth(ty) > 0 && matches(g.value, ty.slice(0, -2) as Ty))) errs.push(`${where}.value must be a ${isText ? "string" : ty.slice(0, -2)} (what one copy is).`);
      if (isText && typeof g.value === "string" && g.value.length * (Number(g.n) || 0) > STRESS_LIMITS.size) errs.push(`${where}: the text would be longer than ${STRESS_LIMITS.size} characters.`);
      break;
    }
    case "string": {
      size("n");
      if (typeof g.alphabet !== "string" || g.alphabet.length < 1 || g.alphabet.length > STRESS_LIMITS.alphabet) errs.push(`${where}.alphabet must be 1 to ${STRESS_LIMITS.alphabet} letters, for example "abc".`);
      if (ty !== "string" && ty !== "string[]") errs.push(`${where}: "string" makes text, but this parameter is ${ty}.`);
      if (ty === "string[]") {
        if (!isInt(g.count)) errs.push(`${where}.count is needed for a string[] parameter (how many strings).`);
        else if ((g.count as number) * (Number(g.n) || 0) > STRESS_LIMITS.size) errs.push(`${where}: count times n must be at most ${STRESS_LIMITS.size}.`);
      }
      break;
    }
    case "grid":
      size("rows");
      size("cols");
      num("min");
      num("max");
      bound(g.min, g.max);
      if (ty !== "int[][]") errs.push(`${where}: "grid" makes a list of lists of numbers, but this parameter is ${ty}.`);
      if (isInt(g.rows) && isInt(g.cols) && g.rows * g.cols > STRESS_LIMITS.size) errs.push(`${where}: rows times cols must be at most ${STRESS_LIMITS.size}.`);
      break;
  }
  return errs;
}

const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** One value from a generator that passed checkGen. */
export function makeValue(g: Gen): unknown {
  switch (g.kind) {
    case "value":
      return g.value;
    case "ints": {
      const r = rng(g.seed ?? 1);
      const a = Array.from({ length: g.n }, () => between(r, g.min, g.max));
      if (g.order) a.sort((x, y) => (g.order === "asc" ? x - y : y - x));
      return a;
    }
    case "range": {
      const a = Array.from({ length: g.n }, (_, i) => (g.start ?? 0) + i);
      return g.order === "desc" ? a.reverse() : a;
    }
    case "perm": {
      const r = rng(g.seed ?? 1);
      const a = Array.from({ length: g.n }, (_, i) => i + 1);
      for (let i = a.length - 1; i > 0; i--) {
        const j = between(r, 0, i);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
    case "repeat":
      return Array.from({ length: g.n }, () => g.value);
    case "string": {
      const r = rng(g.seed ?? 1);
      const text = () => Array.from({ length: g.n }, () => g.alphabet[between(r, 0, g.alphabet.length - 1)]).join("");
      return g.count === undefined ? text() : Array.from({ length: g.count }, text);
    }
    case "grid": {
      const r = rng(g.seed ?? 1);
      return Array.from({ length: g.rows }, () => Array.from({ length: g.cols }, () => between(r, g.min, g.max)));
    }
  }
}

/** The generators of a pack problem as large inputs for the judge (see StressCase). `params` are the function's parameters. */
export function expandStress(params: { name: string; type: Ty }[], stress: PackStress[]): StressCase[] {
  return stress.map((s) => ({
    label: s.label,
    ...(s.limitMs ? { limitMs: s.limitMs } : {}),
    make: () =>
      params.map((p) => {
        const g = s.gen[p.name];
        // A string parameter given "repeat" with a text value means the text repeated n times.
        if (g.kind === "repeat" && p.type === "string" && typeof g.value === "string") return g.value.repeat(g.n);
        return makeValue(g);
      }),
  }));
}

/** Reads the "stress" part of a pack problem. Returns the cleaned list, or every problem found. */
export function checkStress(raw: unknown, params: { name: string; type: Ty }[], where: string, matches: (v: unknown, t: Ty) => boolean): { stress: PackStress[]; errors: string[] } {
  if (raw === undefined) return { stress: [], errors: [] };
  if (!Array.isArray(raw)) return { stress: [], errors: [`${where} must be a list.`] };
  const errors: string[] = [];
  if (raw.length > STRESS_LIMITS.cases) errors.push(`${where} can hold at most ${STRESS_LIMITS.cases} large inputs.`);
  const out: PackStress[] = [];
  raw.slice(0, STRESS_LIMITS.cases).forEach((s, i) => {
    const w = `${where}[${i}]`;
    if (!isObj(s) || typeof s.label !== "string" || s.label.trim().length < 4 || s.label.length > 120) return void errors.push(`${w} needs a "label" (4 to 120 characters, for example "100000 random numbers").`);
    const gen = isGen(s.gen) && params.length === 1 ? { [params[0].name]: s.gen } : s.gen;
    if (!isObj(gen)) return void errors.push(`${w}.gen must map each parameter name to a generator.`);
    const before = errors.length;
    for (const p of params) {
      if (!(p.name in gen)) errors.push(`${w}.gen has no generator for the parameter "${p.name}".`);
      else errors.push(...checkGen(gen[p.name], p.type, `${w}.gen.${p.name}`, matches));
    }
    for (const k of Object.keys(gen)) if (!params.some((p) => p.name === k)) errors.push(`${w}.gen has "${k}", which is not a parameter.`);
    if (s.limitMs !== undefined && (!isInt(s.limitMs) || s.limitMs < 100 || s.limitMs > 10_000)) errors.push(`${w}.limitMs must be a whole number from 100 to 10000.`);
    if (errors.length === before) out.push({ label: s.label.trim(), ...(isInt(s.limitMs) ? { limitMs: s.limitMs } : {}), gen: gen as Record<string, Gen> });
  });
  return { stress: out, errors };
}
