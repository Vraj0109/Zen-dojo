import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES graph problems (problems-cses-graph.ts). Fixed seeds, the biggest allowed sizes and the
// shapes that break slow or careless code.

const { ints, fill, range, letters, S } = H;

export const STRESS_CSES_GRAPH: Record<string, StressCase[]> = {
  "cses-counting-rooms": [
    S("1000x1000 open floor", () => [fill(1000, ".".repeat(1000))]),
    S("1000x1000 alternating stripes", () => [fill(1000, ".#".repeat(500))]),
    S("1000x1000 checkerboard", () => [range(1000).map((r) => (r % 2 === 0 ? ".#".repeat(500) : "#.".repeat(500)))]),
    S("1000x1000 dense walls", () => [fill(1000, "#".repeat(1000))]),
  ],
  "cses-labyrinth": [
    S("1000x1000 open grid", () => [["A" + ".".repeat(999), ...fill(998, ".".repeat(1000)), ".".repeat(999) + "B"]]),
    S("1000x1000 snake path", () => {
      const g = fill(1000, "").map((_, r) => {
        if (r % 2 === 0) return ".".repeat(1000);
        if (r % 4 === 1) return "#".repeat(999) + ".";
        return "." + "#".repeat(999);
      });
      g[0] = "A" + g[0].slice(1);
      g[999] = g[999].slice(0, 999) + "B";
      return [g];
    }),
    S("1000x1000 target blocked", () => [["A" + ".".repeat(999), ...fill(998, ".".repeat(1000)), ".".repeat(998) + "#B"]]),
  ],
  "cses-building-roads": [
    S("100000 isolated cities", () => [100000, []]),
    S("100000 cities line", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("100000 cities pairs", () => [100000, range(50000).map((i) => [2 * i + 1, 2 * i + 2])]),
  ],
  "cses-message-route": [
    S("100000 computers in a line", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("100000 computers disconnected", () => [100000, range(99998, 1).map((i) => [i, i + 1])]),
    S("100000 computers star graph", () => [100000, range(99999, 2).map((i) => [1, i])]),
  ],
  "cses-building-teams": [
    S("100000 pupils bipartite chain", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("99999 pupils odd cycle", () => [99999, [...range(99998, 1).map((i) => [i, i + 1]), [99999, 1]]]),
    S("100000 pupils disconnected components", () => [100000, range(49999, 1).map((i) => [2 * i - 1, 2 * i])]),
  ],
  "cses-round-trip": [
    S("100000 cities tree", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("100000 cities tree with cycle", () => [100000, [...range(99999, 1).map((i) => [i, i + 1]), [100000, 1]]]),
    S("100000 cities forest", () => [100000, range(49999, 1).map((i) => [2 * i - 1, 2 * i])]),
  ],
  "cses-monsters": [
    S("1000x1000 open field with monsters", () => {
      const g = fill(1000, ".".repeat(1000));
      g[500] = ".".repeat(500) + "A" + ".".repeat(499);
      g[100] = ".".repeat(100) + "M" + ".".repeat(899);
      return [g];
    }),
    S("1000x1000 player surrounded", () => {
      const g = fill(1000, ".".repeat(1000));
      g[500] = ".".repeat(499) + "#A#" + ".".repeat(498);
      g[499] = ".".repeat(499) + "###" + ".".repeat(498);
      g[501] = ".".repeat(499) + "###" + ".".repeat(498);
      return [g];
    }),
    S("1000x1000 monsters blocked", () => {
      const g = fill(1000, ".".repeat(1000));
      g[0] = "A" + ".".repeat(999);
      g[999] = ".".repeat(999) + "M";
      return [g];
    }),
  ],
  "cses-shortest-routes-i": [
    S("100000 cities chain", () => [100000, range(99999, 1).map((i) => [i, i + 1, 1000000000])]),
    S("100000 cities star graph", () => [100000, range(99999, 2).map((i) => [1, i, i * 10])]),
    S("50000 cities ladder", () => [50000, [...range(49999, 1).map((i) => [i, i + 1, 5]), ...range(49998, 1).map((i) => [i, i + 2, 8])]]),
  ],
  "cses-cycle-finding": [
    S("2500 vertices positive cycle", () => [2500, [...range(2499, 1).map((i) => [i, i + 1, 1]), [2500, 1, 1]]]),
    S("2500 vertices negative cycle", () => [2500, [...range(2499, 1).map((i) => [i, i + 1, 1]), [2500, 1, -2501]]]),
    S("2500 vertices DAG negative weights", () => [2500, range(2499, 1).map((i) => [i, i + 1, -100])]),
  ],
  "cses-course-schedule": [
    S("100000 courses line", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("100000 courses cycle", () => [100000, [...range(99999, 1).map((i) => [i, i + 1]), [100000, 1]]]),
    S("100000 courses star", () => [100000, range(99999, 2).map((i) => [1, i])]),
  ],
  "cses-longest-flight-route": [
    S("100000 cities chain", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("100000 cities ladder", () => [100000, [...range(99999, 1).map((i) => [i, i + 1]), ...range(99998, 1).map((i) => [i, i + 2])]]),
    S("100000 cities unreachable", () => [100000, range(99998, 1).map((i) => [i, i + 1])]),
  ],
  "cses-game-routes": [
    S("100000 levels ladder", () => [100000, [...range(99999, 1).map((i) => [i, i + 1]), ...range(99998, 1).map((i) => [i, i + 2])]]),
    S("100000 levels linear", () => [100000, range(99999, 1).map((i) => [i, i + 1])]),
    S("100000 levels unreachable", () => [100000, range(99998, 1).map((i) => [i, i + 1])]),
  ],
  "cses-flight-discount": [
    S("100000 cities chain massive edge", () => [100000, [...range(99998, 1).map((i) => [i, i + 1, 10]), [99999, 100000, 1000000000]]]),
    S("100000 cities two routes", () => [100000, [[1, 100000, 1000000000], ...range(99999, 1).map((i) => [i, i + 1, 1000])]]),
    S("50000 cities ladder", () => [50000, [...range(49999, 1).map((i) => [i, i + 1, 50]), ...range(49998, 1).map((i) => [i, i + 2, 80])]]),
  ],
};
