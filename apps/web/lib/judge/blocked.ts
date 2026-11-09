export type JudgeLang = "cpp" | "java" | "javascript";

/** True when a failed start means the OS blocked the program, not that the tool is missing. */
export function isBlockedSpawnError(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException | null)?.code;
  const text = String((e as Error | null)?.message ?? "");
  return code === "UNKNOWN" || code === "EPERM" || code === "EACCES" || /spawn (UNKNOWN|EPERM|EACCES)/.test(text);
}

/** True when an unavailable message comes from the OS blocking the program (Windows Smart App Control). */
export function isBlockedRunMessage(message: unknown): boolean {
  if (typeof message !== "string") return false;
  return message.includes("Smart App Control") || message.includes("refused to start");
}

/** Pick the best alternative language when C++ execution is blocked. */
export function pickFallbackLanguage(blockedLang: string, javaAvailable = true): "java" | "javascript" {
  if (blockedLang === "cpp") {
    return javaAvailable ? "java" : "javascript";
  }
  return "javascript";
}

/** User-facing banner explanation when C++ is blocked by the OS. */
export function blockedBannerMessage(switchedTo: "java" | "javascript"): string {
  const target = switchedTo === "java" ? "Java" : "JavaScript";
  return `Windows Smart App Control blocked the compiled C++ program. Switched to ${target}. Java and JavaScript work because they run through signed runtimes.`;
}
