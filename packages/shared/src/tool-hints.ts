/**
 * Install commands for the tools the judge needs on the user's own computer. Pure data, no I/O.
 * Windows winget ids verified with `winget search --exact` on 2026-11-11. macOS and Linux commands are the
 * standard package names and are not machine-verified here.
 */
export type ToolId = "cpp" | "java" | "javascript" | "python";
export const TOOL_IDS: readonly ToolId[] = ["cpp", "java", "javascript", "python"];

export type PkgManager = "apt" | "dnf";

export interface InstallHint {
  /** The command to copy, or null when there is nothing to run. */
  command: string | null;
  /** One plain sentence to show next to (or instead of) the command. */
  note: string;
}

export const TOOL_LABELS: Record<ToolId, string> = {
  cpp: "C++ compiler (g++)",
  java: "Java JDK (javac and java)",
  javascript: "Node.js",
  python: "Python 3",
};

export const TOOL_USED_FOR: Record<ToolId, string> = {
  cpp: "Running C++ solutions.",
  java: "Running Java solutions and LLD projects.",
  javascript: "Running JavaScript solutions. The desktop app can use its own built-in runtime when Node is not installed.",
  python: "Running Python solutions.",
};

const WIN: Record<ToolId, string> = {
  cpp: "winget install BrechtSanders.WinLibs.POSIX.UCRT",
  java: "winget install EclipseAdoptium.Temurin.17.JDK",
  javascript: "winget install OpenJS.NodeJS.LTS",
  python: "winget install Python.Python.3.12",
};

const MAC: Record<ToolId, string> = {
  cpp: "xcode-select --install",
  java: "brew install openjdk@17",
  javascript: "brew install node",
  python: "brew install python",
};

const APT: Record<ToolId, string> = {
  cpp: "sudo apt-get install g++",
  java: "sudo apt-get install openjdk-17-jdk",
  javascript: "sudo apt-get install nodejs",
  python: "sudo apt-get install python3",
};

const DNF: Record<ToolId, string> = {
  cpp: "sudo dnf install gcc-c++",
  java: "sudo dnf install java-17-openjdk-devel",
  javascript: "sudo dnf install nodejs",
  python: "sudo dnf install python3",
};

const FALLBACK: InstallHint = { command: null, note: "See the project's troubleshooting page (docs/troubleshooting.md) for how to install it." };

/** Install hint for one tool on a Node `process.platform` value. Linux defaults to apt. */
export function hintFor(tool: ToolId, platform: string, pkgManager: PkgManager = "apt"): InstallHint {
  if (platform === "win32") return { command: WIN[tool], note: "Run this in PowerShell or Command Prompt, then choose Check again." };
  if (platform === "darwin") {
    return {
      command: MAC[tool],
      note: tool === "cpp" ? "This installs Apple's command line tools, which include a C++ compiler." : "Needs Homebrew (brew.sh). Choose Check again afterwards.",
    };
  }
  if (platform === "linux") {
    return { command: (pkgManager === "dnf" ? DNF : APT)[tool], note: "Run this in a terminal, then choose Check again." };
  }
  return FALLBACK;
}
