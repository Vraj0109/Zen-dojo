import { describe, expect, it } from "vitest";
import { matchesTy, packProblemSpec, validatePack } from "./packs";
import { checkStress, expandStress, makeValue } from "./judge/stress-gen";

const params = [{ name: "nums", type: "int[]" as const }, { name: "target", type: "int" as const }];

describe("large-input generators", () => {
  it("make the same input every time and respect their bounds", () => {
    const g = { kind: "ints", n: 1000, min: -5, max: 5, seed: 3 } as const;
    const a = makeValue(g) as number[];
    expect(a).toHaveLength(1000);
    expect(a.every((x) => x >= -5 && x <= 5)).toBe(true);
    expect(makeValue(g)).toEqual(a);
    expect(makeValue({ ...g, seed: 4 })).not.toEqual(a);
    const sorted = makeValue({ ...g, order: "asc" }) as number[];
    expect(sorted).toEqual([...sorted].sort((x, y) => x - y));
    expect(makeValue({ kind: "range", n: 4, start: 10, order: "desc" })).toEqual([13, 12, 11, 10]);
    const perm = makeValue({ kind: "perm", n: 50, seed: 1 }) as number[];
    expect([...perm].sort((x, y) => x - y)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
    expect(makeValue({ kind: "repeat", value: 7, n: 3 })).toEqual([7, 7, 7]);
    expect((makeValue({ kind: "string", n: 8, alphabet: "ab", seed: 1 }) as string).length).toBe(8);
    expect(makeValue({ kind: "string", n: 3, alphabet: "x", count: 2 })).toEqual(["xxx", "xxx"]);
    expect(makeValue({ kind: "grid", rows: 2, cols: 3, min: 1, max: 1 })).toEqual([[1, 1, 1], [1, 1, 1]]);
  });

  it("expand into inputs with one value per parameter", () => {
    const { stress, errors } = checkStress([{ label: "1000 numbers", gen: { nums: { kind: "ints", n: 1000, min: 0, max: 9 }, target: { kind: "value", value: 5 } } }], params, "s", matchesTy);
    expect(errors).toEqual([]);
    const input = expandStress(params, stress)[0].make();
    expect(input).toHaveLength(2);
    expect(input[1]).toBe(5);
    // one generator is enough for a function with a single parameter; a string parameter with "repeat" repeats the text
    const one = checkStress([{ label: "long text", gen: { kind: "repeat", value: "ab", n: 3 } }], [{ name: "s", type: "string" }], "s", matchesTy);
    expect(one.errors).toEqual([]);
    expect(expandStress([{ name: "s", type: "string" }], one.stress)[0].make()).toEqual(["ababab"]);
  });

  it("say in plain words what is wrong", () => {
    const bad = (raw: unknown) => checkStress(raw, params, "stress", matchesTy).errors.join(" | ");
    expect(bad("x")).toContain("must be a list");
    expect(bad([{ label: "no", gen: {} }])).toContain('needs a "label"');
    expect(bad([{ label: "too many", gen: { nums: { kind: "ints", n: 5000000, min: 0, max: 1 }, target: { kind: "value", value: 1 } } }])).toContain("nums.n must be a whole number from 0 to 1000000");
    expect(bad([{ label: "wrong kind", gen: { nums: { kind: "magic" }, target: { kind: "value", value: 1 } } }])).toContain('"kind" must be one of');
    expect(bad([{ label: "missing one", gen: { nums: { kind: "range", n: 5 } } }])).toContain('no generator for the parameter "target"');
    expect(bad([{ label: "extra name", gen: { nums: { kind: "range", n: 5 }, target: { kind: "value", value: 1 }, bogus: { kind: "value", value: 1 } } }])).toContain('"bogus", which is not a parameter');
    expect(bad([{ label: "bad value", gen: { nums: { kind: "range", n: 5 }, target: { kind: "value", value: "x" } } }])).toContain("is not a valid int");
    expect(bad([{ label: "text for numbers", gen: { nums: { kind: "string", n: 5, alphabet: "a" }, target: { kind: "value", value: 1 } } }])).toContain("makes text");
    expect(bad([{ label: "int too big", gen: { nums: { kind: "ints", n: 5, min: 0, max: 5000000000 }, target: { kind: "value", value: 1 } } }])).toContain("fit in 32 bits");
    expect(bad(Array.from({ length: 6 }, (_, i) => ({ label: `case number ${i}`, gen: {} })))).toContain("at most 5 large inputs");
  });

  it("are part of a pack problem and become judge large inputs", () => {
    const pack = {
      format: "prepwise-pack",
      version: 1,
      id: "p",
      title: "P",
      description: "",
      sections: [
        {
          title: "S",
          items: [
            {
              type: "problem",
              id: "q",
              title: "Q",
              statement: ["s"],
              constraints: ["c"],
              fn: { name: "f", params, returns: "bool" },
              examples: [{ input: [[1], 1], output: true }],
              tests: [],
              hints: ["h"],
              solution: { idea: ["i"], complexity: "O(n)", cpp: "class Solution {};" },
              stress: [{ label: "100000 numbers", gen: { nums: { kind: "ints", n: 100000, min: 0, max: 9 }, target: { kind: "value", value: 5 } } }],
            },
          ],
        },
      ],
    };
    const check = validatePack(pack);
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    const item = check.pack.sections[0].items[0];
    if (item.type !== "problem") throw new Error("problem expected");
    expect(item.stress).toHaveLength(1);
    const spec = packProblemSpec(item, "p");
    expect(spec.stress).toHaveLength(1);
    expect((spec.stress![0].make()[0] as number[]).length).toBe(100000);
    // a bad generator is an install error with a path
    pack.sections[0].items[0].stress![0].gen.nums.n = 9999999;
    const broken = validatePack(pack);
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.errors.join(" ")).toContain("sections[0].items[0].stress[0].gen.nums.n");
  });
});
