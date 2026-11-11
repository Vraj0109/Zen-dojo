import "server-only";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { ChatMessage } from "@habit/shared";

// Plan 0067: the shared runner for AI tools installed on this computer (claude, gemini, codex).
// Security rules, all required:
//  - shell is never used; the argument list is fixed in code; the prompt goes to the child's stdin only
//  - the child runs in a fresh empty temporary folder that is deleted afterwards
//  - a timeout, an output cap, and the whole process tree is killed on abort, timeout or cap
//  - arguments, stdin and output are never logged

export const CLI_TIMEOUT_MS = 120_000;
export const CLI_MAX_OUTPUT = 200 * 1024;
export const CLI_DETECT_TIMEOUT_MS = 3000;

/**
 * Ends a process and everything it started. Copy of killProcessTree in lib/judge/run.ts (not exported there):
 * taskkill /T on Windows, the detached process group elsewhere.
 */
export function killProcessTree(child: ReturnType<typeof spawn>): void {
  const pid = child.pid;
  if (!pid) {
    try {
      child.kill("SIGKILL");
    } catch {}
    return;
  }
  if (process.platform === "win32") {
    execFile("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true }, () => {});
    try {
      child.kill("SIGKILL");
    } catch {}
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {}
    }
  }
}

const SAFE_ARG = /^[A-Za-z0-9._:=,/-]+$/;
const UNSAFE_PATH = /["&|<>^%\r\n\0]/;

export interface CliCommand {
  file: string;
  args: string[];
  /** true when the last argument is one pre-quoted string for cmd.exe */
  verbatim: boolean;
}

/**
 * Pure. Builds what to spawn for a resolved program path and a FIXED argument list.
 * A .cmd/.bat shim on Windows runs through `cmd.exe /d /s /c "<path>" <args>`; everything else is started directly.
 * Throws if the path or an argument holds a character that would need escaping for cmd.exe.
 */
export function buildCommand(resolved: string, fixedArgs: string[], platform: string = process.platform): CliCommand {
  const isShim = platform === "win32" && /\.(cmd|bat)$/i.test(resolved);
  if (!isShim) return { file: resolved, args: fixedArgs, verbatim: false };
  if (UNSAFE_PATH.test(resolved)) throw new Error("The tool path has characters that are not safe to run.");
  for (const a of fixedArgs) if (!SAFE_ARG.test(a)) throw new Error("A fixed argument is not safe for cmd.exe.");
  return { file: "cmd.exe", args: ["/d", "/s", "/c", `"${resolved}"${fixedArgs.length ? " " + fixedArgs.join(" ") : ""}`], verbatim: true };
}

/** Pure. The plain-text prompt sent on stdin: the instructions, the conversation, and what to do. */
export function formatTranscript(messages: ChatMessage[]): string {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content.trim());
  const turns = messages.filter((m) => m.role !== "system");
  const parts: string[] = [];
  if (system.length) parts.push(`Instructions:\n${system.join("\n\n")}`);
  parts.push("Conversation:\n" + turns.map((m) => `${m.role === "user" ? "Learner" : "Assistant"}: ${m.content.trim()}`).join("\n\n"));
  parts.push("Write only the assistant's next reply to the learner's last message. Do not use any tools.");
  return parts.join("\n\n");
}

/** Pure. Pulls complete lines out of a text stream. */
export async function* lines(chunks: AsyncIterable<string>): AsyncGenerator<string> {
  let buf = "";
  for await (const c of chunks) {
    buf += c;
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (line) yield line;
    }
  }
  if (buf.trim()) yield buf;
}

/** Pure. From `where` output pick something that can run: .exe/.com first, then .cmd/.bat (Windows); the first line elsewhere. */
export function pickProgram(found: string[], platform: string = process.platform): string | null {
  if (platform !== "win32") return found[0] ?? null;
  return found.find((f) => /\.(exe|com)$/i.test(f)) ?? found.find((f) => /\.(cmd|bat)$/i.test(f)) ?? null;
}

/** Finds a program on PATH with where/which (a constant name, never request data). Returns null if missing. */
export function resolveProgram(name: string, platform: string = process.platform): Promise<string | null> {
  return new Promise((resolve) => {
    const finder = platform === "win32" ? "where.exe" : "which";
    execFile(finder, [name], { timeout: CLI_DETECT_TIMEOUT_MS, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      const found = String(stdout).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      resolve(pickProgram(found, platform));
    });
  });
}

export interface RunOptions {
  file: string;
  args: string[];
  input: string;
  signal: AbortSignal;
  timeoutMs?: number;
  maxOutput?: number;
  /** Extra environment variables on top of the user's own (the tool needs its login). */
  env?: Record<string, string>;
  platform?: string;
}

/**
 * Runs the program in a fresh empty temporary folder with `input` on stdin and yields stdout text as it arrives.
 * Ends quietly on abort. Throws on timeout, output cap, a failed start or a non-zero exit.
 */
export async function* runCli(opts: RunOptions): AsyncGenerator<string> {
  const timeoutMs = opts.timeoutMs ?? CLI_TIMEOUT_MS;
  const maxOutput = opts.maxOutput ?? CLI_MAX_OUTPUT;
  const cmd = buildCommand(opts.file, opts.args, opts.platform);
  const cwd = await mkdtemp(path.join(os.tmpdir(), "zen-ai-"));
  let child: ReturnType<typeof spawn> | null = null;
  try {
    if (opts.signal.aborted) return;
    child = spawn(cmd.file, cmd.args, {
      cwd,
      shell: false,
      windowsHide: true,
      windowsVerbatimArguments: cmd.verbatim,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(opts.env ?? {}) },
    });
    const proc = child;
    const queue: string[] = [];
    let wake: (() => void) | null = null;
    let finished = false;
    let failure: Error | null = null;
    let exitCode: number | null = null;
    let total = 0;
    let stderr = "";
    const out = new StringDecoder("utf8");
    const notify = () => {
      const w = wake;
      wake = null;
      w?.();
    };
    const fail = (e: Error) => {
      if (!failure) failure = e;
      killProcessTree(proc);
      finished = true;
      notify();
    };

    proc.stdout!.on("data", (b: Buffer) => {
      if (failure) return;
      total += b.length;
      if (total > maxOutput) return fail(new Error("The answer was too long and was cut off."));
      const s = out.write(b);
      if (s) queue.push(s);
      notify();
    });
    proc.stderr!.on("data", (b: Buffer) => {
      if (stderr.length < 400) stderr += b.toString("utf8").slice(0, 400);
    });
    proc.on("error", (e: NodeJS.ErrnoException) => fail(new Error(e.code === "ENOENT" ? "The AI tool was not found." : "The AI tool could not be started.")));
    proc.on("close", (code) => {
      exitCode = code;
      const rest = out.end();
      if (rest) queue.push(rest);
      finished = true;
      notify();
    });
    proc.stdin!.on("error", () => {});
    proc.stdin!.end(opts.input);

    const timer = setTimeout(() => fail(new Error(`The AI tool took longer than ${Math.round(timeoutMs / 1000)} seconds.`)), timeoutMs);
    const onAbort = () => {
      killProcessTree(proc);
      finished = true;
      notify();
    };
    opts.signal.addEventListener("abort", onAbort, { once: true });
    try {
      for (;;) {
        while (queue.length) yield queue.shift()!;
        if (failure) throw failure;
        if (opts.signal.aborted) return;
        if (finished) break;
        await new Promise<void>((r) => {
          wake = r;
        });
      }
      if (exitCode !== 0) {
        const hint = stderr.trim().split(/\r?\n/)[0]?.slice(0, 200);
        throw new Error(`The AI tool stopped with an error${hint ? `: ${hint}` : "."}`);
      }
    } finally {
      clearTimeout(timer);
      opts.signal.removeEventListener("abort", onAbort);
    }
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) killProcessTree(child);
    await rm(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
  }
}
