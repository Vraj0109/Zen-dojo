// Stress inputs (large cases for speed and memory checks) for problems whose spec used to hold them inline. Moved out of
// problems-*.ts in plan 0117 step 2 so the registry (stress-registry.ts) is the only place stress is looked up.
// Keyed by problem id. Note: the registry checks the stress*.ts maps first, so an entry here is used only when no
// other stress map has that id.
import { callList, rng } from "./design";
import type { StressCase } from "./types";

const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const letters = (r: () => number, n: number, alphabet: number) => Array.from({ length: n }, () => String.fromCharCode(97 + between(r, 0, alphabet - 1))).join("");

/** Random bookings [start, end) inside 0..limit, each at most maxLen long. */
function bookings(seed: number, className: string, n: number, limit: number, maxLen: number) {
  const r = rng(seed);
  const ops: string[] = [className];
  const args: unknown[][] = [[]];
  for (let i = 0; i < n; i++) {
    const start = between(r, 0, limit - maxLen - 1);
    ops.push("book");
    args.push([start, start + between(r, 1, maxLen)]);
  }
  return callList(ops, args);
}

export const STRESS_INLINE: Record<string, StressCase[]> = {
  "lc-146": [
      {
        label: "200000 mixed calls, 2000 keys, capacity 1000",
        make: () => {
          const r = rng(146);
          const ops: string[] = ["LRUCache"];
          const args: unknown[][] = [[1000]];
          for (let i = 0; i < 200000; i++) {
            if (r() < 0.5) { ops.push("put"); args.push([between(r, 0, 1999), between(r, 0, 1000000000)]); }
            else { ops.push("get"); args.push([between(r, 0, 1999)]); }
          }
          return callList(ops, args);
        },
      },
      {
        label: "100000 puts then 100000 gets, capacity 100000",
        make: () => {
          const ops: string[] = ["LRUCache"];
          const args: unknown[][] = [[100000]];
          for (let i = 0; i < 100000; i++) { ops.push("put"); args.push([i, i]); }
          for (let i = 0; i < 100000; i++) { ops.push("get"); args.push([i]); }
          return callList(ops, args);
        },
      },
  ],
  "lc-460": [
      {
        label: "200000 mixed calls, 3000 keys, capacity 1000",
        make: () => {
          const r = rng(460);
          const ops: string[] = ["LFUCache"];
          const args: unknown[][] = [[1000]];
          for (let i = 0; i < 200000; i++) {
            if (r() < 0.4) { ops.push("put"); args.push([between(r, 0, 2999), between(r, 0, 1000000000)]); }
            else { ops.push("get"); args.push([between(r, 0, 2999)]); }
          }
          return callList(ops, args);
        },
      },
  ],
  "lc-208": [
      {
        label: "50000 inserts and 50000 lookups of words up to 40 letters",
        make: () => {
          const r = rng(208);
          const ops: string[] = ["Trie"];
          const args: unknown[][] = [[]];
          for (let i = 0; i < 50000; i++) { ops.push("insert"); args.push([letters(r, between(r, 5, 40), 3)]); }
          for (let i = 0; i < 50000; i++) { ops.push(r() < 0.5 ? "search" : "startsWith"); args.push([letters(r, between(r, 3, 40), 3)]); }
          return callList(ops, args);
        },
      },
  ],
  "lc-211": [
      {
        label: "30000 words of up to 25 letters, 20000 searches with dots",
        make: () => {
          const r = rng(211);
          const ops: string[] = ["WordDictionary"];
          const args: unknown[][] = [[]];
          const words: string[] = [];
          for (let i = 0; i < 30000; i++) { const w = letters(r, between(r, 3, 25), 6); words.push(w); ops.push("addWord"); args.push([w]); }
          for (let i = 0; i < 20000; i++) {
            const chars = (r() < 0.6 ? words[between(r, 0, words.length - 1)] : letters(r, between(r, 3, 25), 6)).split("");
            for (let d = between(r, 0, 2); d > 0; d--) chars[between(r, 0, chars.length - 1)] = ".";
            ops.push("search");
            args.push([chars.join("")]);
          }
          return callList(ops, args);
        },
      },
  ],
  "lc-981": [
      {
        label: "100000 sets over 100 keys, then 100000 gets",
        make: () => {
          const r = rng(981);
          const ops: string[] = ["TimeMap"];
          const args: unknown[][] = [[]];
          const clock = new Array<number>(100).fill(0);
          for (let i = 0; i < 100000; i++) {
            const k = between(r, 0, 99);
            clock[k] += between(r, 1, 50);
            ops.push("set");
            args.push([`key${k}`, letters(r, 8, 26), clock[k]]);
          }
          for (let i = 0; i < 100000; i++) { ops.push("get"); args.push([`key${between(r, 0, 99)}`, between(r, 1, 2600000)]); }
          return callList(ops, args);
        },
      },
  ],
  "lc-1146": [
      {
        label: "50000 elements, 100000 sets, snaps and gets",
        make: () => {
          const r = rng(1146);
          const ops: string[] = ["SnapshotArray"];
          const args: unknown[][] = [[50000]];
          let snaps = 0;
          for (let i = 0; i < 99999; i++) {
            const x = r();
            if (x < 0.45) { ops.push("set"); args.push([between(r, 0, 49999), between(r, 0, 1000000000)]); }
            else if (x < 0.55 || snaps === 0) { ops.push("snap"); args.push([]); snaps++; }
            else { ops.push("get"); args.push([between(r, 0, 49999), between(r, 0, snaps - 1)]); }
          }
          return callList(ops, args);
        },
      },
  ],
  "lc-729": [{ label: "100000 short bookings in a wide range", make: () => bookings(729, "MyCalendar", 100000, 1000000000, 50000) }],
  "lc-731": [{ label: "1000 bookings that often overlap", make: () => bookings(731, "MyCalendarTwo", 1000, 100000, 3000) }],
  "lc-732": [{ label: "400 bookings that often overlap", make: () => bookings(732, "MyCalendarThree", 400, 1000000000, 600000000) }],
  "lc-380": [
      {
        label: "200000 inserts and removes, with getRandom on one-element sets",
        make: () => {
          const r = rng(380);
          const ops: string[] = ["RandomizedSet"];
          const args: unknown[][] = [[]];
          const present = new Set<number>();
          while (ops.length < 200000) {
            if (ops.length % 20000 === 0 && present.size > 0) {
              // Drain the set down to one element and ask for it.
              const keep = [...present][0];
              for (const v of [...present]) {
                if (v === keep) continue;
                ops.push("remove");
                args.push([v]);
                present.delete(v);
              }
              ops.push("getRandom");
              args.push([]);
              continue;
            }
            const v = between(r, 0, 30000);
            if (r() < 0.55) { ops.push("insert"); present.add(v); }
            else { ops.push("remove"); present.delete(v); }
            args.push([v]);
          }
          return callList(ops, args);
        },
      },
  ],
  "lc-355": [
      {
        label: "30000 calls, 500 users who follow many others",
        make: () => {
          const r = rng(355);
          const ops: string[] = ["Twitter"];
          const args: unknown[][] = [[]];
          let tweet = 0;
          for (let i = 0; i < 29999; i++) {
            const x = r();
            if (x < 0.35) { ops.push("postTweet"); args.push([between(r, 1, 500), tweet++]); }
            else if (x < 0.65) { ops.push("getNewsFeed"); args.push([between(r, 1, 500)]); }
            else {
              const a = between(r, 1, 500);
              let b = between(r, 1, 500);
              if (b === a) b = (a % 500) + 1;
              ops.push(x < 0.95 ? "follow" : "unfollow");
              args.push([a, b]);
            }
          }
          return callList(ops, args);
        },
      },
  ],
  "lc-875": [
      { label: "pile = 1000000000", make: () => [[1000000000], 2] },
      { label: "pile = 312884470", make: () => [[312884470], 312884469] },
  ],
  "lc-204": [
      { label: "n = 49979", make: () => [49979] },
  ],
  "lc-70": [
      { label: "n = 30", make: () => [30] },
      { label: "n = 45", make: () => [45] },
  ],
};
