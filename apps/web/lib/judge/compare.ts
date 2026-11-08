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
