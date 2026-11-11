import { describe, expect, it } from "vitest";
import { isSetupProblem } from "./setup-hint";

describe("isSetupProblem", () => {
  it("recognises the Mac clang header error", () => {
    expect(isSetupProblem("code added by the judge: fatal error: 'bits/stdc++.h' file not found\n1 | #include<bits/stdc++.h>\n1 error generated.")).toBe(true);
  });
  it("recognises the judge's own missing-tool messages", () => {
    expect(isSetupProblem("g++ was not found. Install a C++ compiler and restart the app.")).toBe(true);
    expect(isSetupProblem("Python 3 was not found. Install it")).toBe(true);
  });
  it("does not blame the learner's own compile errors on the setup", () => {
    expect(isSetupProblem("line 5: error: expected ';' before '}' token")).toBe(false);
    expect(isSetupProblem("line 3: error: 'foo' was not declared in this scope")).toBe(false);
    expect(isSetupProblem(undefined)).toBe(false);
  });
});
