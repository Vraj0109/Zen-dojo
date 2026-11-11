import "server-only";
import { execFile } from "node:child_process";
import { TOOL_IDS, TOOL_LABELS, TOOL_USED_FOR, hintFor, type InstallHint, type PkgManager, type ToolId } from "@habit/shared";
import { pythonCommand, resolveTool } from "./resolve";

export interface ToolStatus {
  id: ToolId;
  label: string;
  found: boolean;
  version: string | null;
  usedFor: string;
  hint: InstallHint;
}

export interface ExecResult {
  ok: boolean;
  /** stdout and stderr together (java and javac print their version on stderr). */
  output: string;
}
export type ExecFn = (file: string, args: string[], env?: Record<string, string>) => Promise<ExecResult>;

const TIMEOUT_MS = 5000;

/** Runs a fixed program with fixed arguments (no shell, 5 s limit). Never rejects. */
export const execWithTimeout = (timeoutMs: number): ExecFn => (file, args, env) =>
  new Promise((resolve) => {
    try {
      execFile(
        file,
        args,
        { timeout: timeoutMs, windowsHide: true, encoding: "utf8", env: env ? { ...process.env, ...env } : process.env },
        (error, stdout, stderr) => resolve({ ok: !error, output: `${stdout ?? ""}${stderr ?? ""}` }),
      );
    } catch {
      resolve({ ok: false, output: "" });
    }
  });

export const defaultExec: ExecFn = execWithTimeout(TIMEOUT_MS);

function firstVersion(text: string): string | null {
  const m = /(\d+\.\d+(?:\.\d+)?(?:[._]\d+)?)/.exec(text);
  return m ? m[1] : null;
}

async function probe(id: Exclude<ToolId, "python">, exec: ExecFn): Promise<{ found: boolean; version: string | null }> {
  if (id === "cpp") {
    const c = resolveTool("cpp");
    const r = await exec(c.file, [...c.args, "--version"], c.env);
    return { found: r.ok, version: r.ok ? firstVersion(r.output.split("\n")[0] ?? "") : null };
  }
  if (id === "java") {
    const javac = resolveTool("javac");
    const java = resolveTool("java");
    const [a, b] = await Promise.all([exec(javac.file, [...javac.args, "-version"], javac.env), exec(java.file, [...java.args, "-version"], java.env)]);
    const found = a.ok && b.ok;
    return { found, version: found ? firstVersion(a.output) : null };
  }
  const n = resolveTool("node");
  const r = await exec(n.file, [...n.args, "--version"], n.env);
  return { found: r.ok, version: r.ok ? firstVersion(r.output) : null };
}

/** Linux package manager guess for the install hint. dnf when /usr/bin/dnf exists, otherwise apt. */
function guessPkgManager(): PkgManager {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    return fs.existsSync("/usr/bin/dnf") && !fs.existsSync("/usr/bin/apt-get") ? "dnf" : "apt";
  } catch {
    return "apt";
  }
}

/** Which of the tools the judge needs are on this computer. Never throws. */
export async function detectTools(opts: { exec?: ExecFn; platform?: string; pkgManager?: PkgManager } = {}): Promise<ToolStatus[]> {
  const exec = opts.exec ?? defaultExec;
  const platform = opts.platform ?? process.platform;
  const pkg = opts.pkgManager ?? (platform === "linux" ? guessPkgManager() : "apt");
  return Promise.all(
    TOOL_IDS.map(async (id): Promise<ToolStatus> => {
      let found = false;
      let version: string | null = null;
      try {
        if (id === "python") {
          const p = pythonCommand();
          found = p.found;
          version = p.version ?? null;
        } else {
          ({ found, version } = await probe(id, exec));
        }
      } catch {
        found = false;
        version = null;
      }
      return { id, label: TOOL_LABELS[id], found, version, usedFor: TOOL_USED_FOR[id], hint: hintFor(id, platform, pkg) };
    }),
  );
}
