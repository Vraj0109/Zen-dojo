import { H } from "./stress";
import type { StressCase } from "./types";

// Large inputs for the CSES sorting and searching problems (problems-cses-sorting.ts).
// Seeded pseudorandom values and edge shapes, checking correctness and speed within limits.

const { ints, fill, range, shuffled, S } = H;

export const STRESS_CSES_SORTING: Record<string, StressCase[]> = {
  "cses-distinct-numbers": [
    S("200000 random integers", () => [ints(200000, 1, 1000000000, 4001)]),
    S("200000 equal integers", () => [fill(200000, 7777777)]),
  ],
  "cses-apartments": [
    S("200000 applicants and 200000 apartments", () => [ints(200000, 1, 1000000000, 4011), ints(200000, 1, 1000000000, 4012), 10000]),
    S("all applicants and apartments equal", () => [fill(200000, 500000), fill(200000, 500000), 0]),
  ],
  "cses-ferris-wheel": [
    S("200000 random weights", () => [ints(200000, 1, 1000000000, 4021), 1000000000]),
    S("200000 equal weights", () => [fill(200000, 500000000), 1000000000]),
  ],
  "cses-concert-tickets": [
    S("100000 tickets and 100000 customers", () => [ints(100000, 1, 1000000000, 4031), ints(100000, 1, 1000000000, 4032)]),
    S("100000 identical tickets", () => [fill(100000, 500), fill(100000, 500)]),
  ],
  "cses-restaurant-customers": [
    S("100000 sequential customers", () => [range(100000).map((i) => [i * 2 + 1, i * 2 + 2])]),
    S("100000 nested customers", () => [range(100000).map((i) => [i + 1, 200000 - i])]),
  ],
  "cses-movie-festival": [
    S("100000 disjoint movies", () => [range(100000).map((i) => [i * 10, i * 10 + 5])]),
    S("100000 overlapping movies", () => [range(100000).map((i) => [i + 1, 200000 - i])]),
  ],
  "cses-sum-of-two-values": [
    S("100000 distinct numbers, pair exists", () => {
      const a = range(100000, 1).map((x) => x * 3);
      const target = a[12345] + a[87654];
      return [a, target];
    }),
    S("100000 numbers, no pair", () => [range(100000, 1).map((x) => x * 2), 1000000001]),
  ],
  "cses-maximum-subarray-sum": [
    S("200000 random numbers", () => [ints(200000, -1000000000, 1000000000, 4081)]),
    S("200000 negative numbers", () => [ints(200000, -1000000000, -1, 4082)]),
  ],
  "cses-stick-lengths": [
    S("200000 random lengths", () => [ints(200000, 1, 1000000000, 4091)]),
    S("200000 equal lengths", () => [fill(200000, 1000000000)]),
  ],
  "cses-missing-coin-sum": [
    S("200000 random coins", () => [ints(200000, 1, 1000000000, 4101)]),
    S("200000 ones", () => [fill(200000, 1)]),
  ],
  "cses-collecting-numbers": [
    S("200000 shuffled numbers", () => [shuffled(range(200000, 1), 4111)]),
    S("200000 reversed numbers", () => [range(200000, 1).reverse()]),
  ],
  "cses-playlist": [
    S("100000 random songs", () => [ints(100000, 1, 1000000000, 4121)]),
    S("100000 songs with repeated cycles", () => [Array.from({ length: 100000 }, (_, i) => i % 500)]),
  ],
  "cses-towers": [
    S("200000 random cubes", () => [ints(200000, 1, 1000000000, 4131)]),
    S("200000 ascending cubes", () => [range(200000, 1)]),
    S("200000 descending cubes", () => [range(200000, 1).reverse()]),
  ],
  "cses-traffic-lights": [
    S("100000 lights on long street", () => [1000000000, shuffled(range(100000, 1).map((i) => i * 9000), 4141)]),
    S("100000 sequential lights", () => [100001, range(100000, 1)]),
  ],
  "cses-distinct-values-subarrays": [
    S("100000 random numbers", () => [ints(100000, 1, 1000000000, 4151)]),
    S("100000 cyclic numbers", () => [Array.from({ length: 100000 }, (_, i) => i % 1000)]),
  ],
  "cses-nearest-smaller-values": [
    S("200000 random numbers", () => [ints(200000, 1, 1000000000, 4161)]),
    S("200000 decreasing numbers", () => [range(200000, 1).reverse()]),
    S("200000 increasing numbers", () => [range(200000, 1)]),
  ],
  "cses-subarray-sums-i": [
    S("200000 random positive numbers", () => [ints(200000, 1, 10000, 4171), 50000]),
    S("200000 ones", () => [fill(200000, 1), 100000]),
  ],
  "cses-subarray-sums-ii": [
    S("100000 random numbers in range", () => [ints(100000, -1000, 1000, 4181), 0]),
    S("100000 alternating 1 and -1", () => [Array.from({ length: 100000 }, (_, i) => (i % 2 === 0 ? 1 : -1)), 0]),
  ],
  "cses-tasks-and-deadlines": [
    S("100000 random tasks", () => [range(100000).map((i) => [100000 - i, (i + 1) * 1000])]),
    S("100000 equal duration tasks", () => [Array.from({ length: 100000 }, (_, i) => [100, (i + 1) * 100])]),
  ],
  "cses-sum-of-three-values": [
    S("5000 numbers, unique triplet", () => [
      [...range(4997, 10).map((x) => x * 10), 1, 2, 4],
      7,
    ]),
    S("5000 numbers, no triplet", () => [range(5000, 1).map((x) => x * 10), 999999999]),
  ],
  "cses-factory-machines": [
    S("200000 machines of time 10^9", () => [fill(200000, 1000000000), 1000000000]),
    S("200000 random machines", () => [ints(200000, 1, 1000000, 4211), 1000000000]),
  ],
  "cses-array-division": [
    S("200000 random numbers, k = 1000", () => [ints(200000, 1, 1000000000, 4221), 1000]),
    S("200000 equal numbers, k = 200000", () => [fill(200000, 1000000000), 200000]),
  ],
};
