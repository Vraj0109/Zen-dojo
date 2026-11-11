import { describe, expect, it } from "vitest";
import { MODEL_TIERS, describeHardware, recommendModel, usableGb } from "./ai-models";

describe("recommendModel", () => {
  it("gives 4 GB of RAM the smallest tier", () => {
    expect(recommendModel({ ramGb: 4, gpuGb: null })).toBe(MODEL_TIERS[0]);
  });
  it("gives 16 GB of RAM and no GPU a mid tier", () => {
    const m = recommendModel({ ramGb: 16, gpuGb: null });
    expect(m).toBe(MODEL_TIERS[1]);
  });
  it("gives a 24 GB GPU the largest tier", () => {
    expect(recommendModel({ ramGb: 16, gpuGb: 24 })).toBe(MODEL_TIERS[MODEL_TIERS.length - 1]);
  });
  it("gives unknown hardware the smallest tier", () => {
    expect(recommendModel({ ramGb: 0, gpuGb: null })).toBe(MODEL_TIERS[0]);
    expect(recommendModel({ ramGb: NaN, gpuGb: NaN })).toBe(MODEL_TIERS[0]);
  });
  it("uses GPU memory when there is a GPU, else 60% of RAM", () => {
    expect(usableGb({ ramGb: 32, gpuGb: 8 })).toBe(8);
    expect(usableGb({ ramGb: 10, gpuGb: null })).toBeCloseTo(6);
  });
  it("has tiers in ascending order with valid tags", () => {
    for (let i = 1; i < MODEL_TIERS.length; i++) expect(MODEL_TIERS[i].minGb).toBeGreaterThan(MODEL_TIERS[i - 1].minGb);
    for (const t of MODEL_TIERS) expect(t.model).toMatch(/^[a-zA-Z0-9._:/-]{1,100}$/);
  });
  it("describes the computer in plain words", () => {
    expect(describeHardware({ ramGb: 16, gpuGb: null })).toContain("16 GB of memory");
  });
});
