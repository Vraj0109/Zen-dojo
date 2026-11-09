// Comparing what your function returned with the expected answer (both JSON values).

const EPS = 1e-6;

/** Sorts every array (recursively) by its JSON text, so two lists with the same elements in any order become equal. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) {
    return v.map(canonical).sort((a, b) => {
      const x = JSON.stringify(a);
      const y = JSON.stringify(b);
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }
  return v;
}

function same(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  return a === b;
}

/** Numbers match within a tiny tolerance (for doubles). `unordered` ignores the order of returned lists. */
export function sameAnswer(expected: unknown, actual: unknown, unordered = false): boolean {
  return unordered ? same(canonical(expected), canonical(actual)) : same(expected, actual);
}

/** For a design-a-class case (input [ops, args]): says which operation first gave a wrong answer. */
export function firstDifference(input: unknown[], expected: unknown, actual: unknown): string | undefined {
  const ops = input[0], args = input[1];
  if (!Array.isArray(ops) || !Array.isArray(args) || !Array.isArray(expected) || !Array.isArray(actual)) return undefined;
  if (actual.length !== expected.length) return `Your code answered ${actual.length} operations; there are ${expected.length}.`;
  for (let k = 0; k < expected.length; k++) {
    if (same(expected[k], actual[k])) continue;
    const list = Array.isArray(args[k]) ? (args[k] as unknown[]).map((x) => JSON.stringify(x)).join(", ") : "";
    return `Operation ${k + 1}, ${String(ops[k])}(${list}), returned ${JSON.stringify(actual[k])}; expected ${JSON.stringify(expected[k])}.`;
  }
  return undefined;
}
