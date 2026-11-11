// When a Run fails because of the computer's setup (a missing tool, or a compiler without a header the judge needs) and not because of the
// learner's code, the results should say so and point to Settings > Tools for running code. Pure text checks, no I/O.

/** Messages that mean "the tool is missing or broken here" (the judge's own "not found" messages and typical operating-system ones). */
const SETUP_PATTERNS: RegExp[] = [
  /was not found\b/i, // the judge's own messages: "g++ was not found", "A JDK was not found", "Node was not found", "Python 3 was not found"
  /fatal error: .*(file not found|no such file)/i, // a header the compiler does not have (for example bits/stdc++.h on Apple's clang)
  /cannot execute ['"`]?cc1plus/i,
  /command not found|is not recognized as an internal or external command/i,
  /cannot find (the )?(symbol|module) .*(java\.|javax\.)/i,
  /unsupported class file major version|invalid target release/i, // a JDK that does not match
];

/** True when the message looks like a setup problem on this computer rather than a mistake in the learner's code. */
export function isSetupProblem(message: string | undefined | null): boolean {
  if (!message) return false;
  return SETUP_PATTERNS.some((p) => p.test(message));
}

export const TOOLS_SETTINGS_HREF = "/profile/settings/tools";
