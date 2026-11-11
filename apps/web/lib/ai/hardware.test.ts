import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { detectHardware, parseNvidiaSmi } from "./hardware";

describe("parseNvidiaSmi", () => {
  it("parses one GPU", () => {
    const r = parseNvidiaSmi("NVIDIA GeForce RTX 4060, 8188\n");
    expect(r?.name).toBe("NVIDIA GeForce RTX 4060");
    expect(r?.gb).toBeCloseTo(8, 0);
  });
  it("uses the largest of two GPUs", () => {
    const r = parseNvidiaSmi("GPU A, 8192\r\nGPU B, 24576\r\n");
    expect(r).toEqual({ name: "GPU B", gb: 24 });
  });
  it("returns null for garbage", () => {
    expect(parseNvidiaSmi("")).toBeNull();
    expect(parseNvidiaSmi("NVIDIA-SMI has failed because it couldn't communicate")).toBeNull();
    expect(parseNvidiaSmi("a, notanumber")).toBeNull();
    expect(parseNvidiaSmi(undefined as unknown as string)).toBeNull();
  });
});

describe("detectHardware", () => {
  it("never throws and reports memory", async () => {
    const hw = await detectHardware();
    expect(hw.ramGb).toBeGreaterThan(0);
  });
});
