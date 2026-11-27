// The pattern -> cp-algorithms.com article map lives in the content database (doc "cp-algorithms", plan 0117).

/** The cp-algorithms.com page for an article path (relative to `src/` in cp-algorithms/cp-algorithms, without `.md`). */
export function cpAlgoUrl(path: string): string {
  return `https://cp-algorithms.com/${path}.html`;
}
