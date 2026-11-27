import { describe, expect, it } from "vitest";
import { cpAlgoUrl } from "./cp-algorithms";

// The pattern -> article map is content (doc "cp-algorithms"); verifyContent checks its pattern ids.
describe("cp-algorithms", () => {
  it("builds the correct cp-algorithms website URL", () => {
    expect(cpAlgoUrl("graph/dijkstra")).toBe("https://cp-algorithms.com/graph/dijkstra.html");
  });
});
