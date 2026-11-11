import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { buildCommand, formatTranscript, lines, pickProgram, runCli } from "./cli";
import { claudeStreamText } from "./cli-provider";
import { detectProviders, getProvider } from "./index";

// A fake CLI: a Node script that reads stdin and behaves by the first argument. Runs through the same runner as the real tools.
const dir = mkdtempSync(path.join(os.tmpdir(), "fake-cli-"));
const script = path.join(dir, "fake.js");
writeFileSync(
  script,
  `
const fs = require("fs");
const mode = process.argv[2];
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  if (mode === "echo") { process.stdout.write("cwd=" + process.cwd() + "\\n"); process.stdout.write("argv=" + JSON.stringify(process.argv.slice(2)) + "\\n"); process.stdout.write("stdin=" + input); }
  if (mode === "stream") { process.stdout.write("one "); setTimeout(() => { process.stdout.write("two"); }, 150); }
  if (mode === "hang") { process.stdout.write("pid=" + process.pid + "\\n"); setInterval(() => {}, 1000); }
  if (mode === "flood") { const big = "x".repeat(10000); const t = setInterval(() => process.stdout.write(big), 1); }
  if (mode === "fail") { process.stderr.write("boom\\n"); process.exit(3); }
});
`,
);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let s = "";
  for await (const c of gen) s += c;
  return s;
}
const run = (mode: string, extra: Partial<Parameters<typeof runCli>[0]> = {}) =>
  runCli({ file: process.execPath, args: [script, mode], input: "", signal: new AbortController().signal, ...extra });

describe("runCli", () => {
  it("sends the prompt on stdin, never in argv, and runs in an empty temp folder that is removed", async () => {
    const secret = "SECRET PROMPT TEXT";
    const out = await collect(run("echo", { input: secret }));
    expect(out).toContain(`stdin=${secret}`);
    expect(out).toContain(`argv=${JSON.stringify(["echo"])}`);
    expect(out).not.toContain(`argv=${secret}`);
    const cwd = /cwd=(.*)\n/.exec(out)![1];
    expect(path.basename(cwd).startsWith("zen-ai-")).toBe(true);
    expect(path.resolve(cwd).startsWith(path.resolve(os.tmpdir()))).toBe(true);
    expect(existsSync(cwd)).toBe(false);
  });

  it("streams output as it arrives", async () => {
    const pieces: string[] = [];
    const times: number[] = [];
    for await (const c of run("stream")) {
      pieces.push(c);
      times.push(Date.now());
    }
    expect(pieces.join("")).toBe("one two");
    expect(pieces.length).toBeGreaterThan(1);
  });

  it("kills a process that runs too long", async () => {
    await expect(collect(run("hang", { timeoutMs: 400 }))).rejects.toThrow(/longer than/);
  });

  it("kills the process on abort", async () => {
    const ac = new AbortController();
    let pid = 0;
    const it = run("hang", { signal: ac.signal });
    for await (const c of it) {
      pid = Number(/pid=(\d+)/.exec(c)![1]);
      ac.abort();
    }
    expect(pid).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 500));
    let alive = true;
    try {
      process.kill(pid, 0);
    } catch {
      alive = false;
    }
    expect(alive).toBe(false);
  });

  it("stops at the output cap", async () => {
    await expect(collect(run("flood", { maxOutput: 50_000, timeoutMs: 10_000 }))).rejects.toThrow(/too long/);
  });

  it("reports a failed exit without leaking the prompt", async () => {
    await expect(collect(run("fail", { input: "private" }))).rejects.toThrow(/stopped with an error: boom/);
  });

  it("reports a missing program", async () => {
    await expect(collect(runCli({ file: path.join(dir, "no-such-program"), args: [], input: "", signal: new AbortController().signal }))).rejects.toThrow(/not found/);
  });
});

describe("buildCommand", () => {
  it("starts normal programs directly", () => {
    expect(buildCommand("C:\\bin\\claude.exe", ["-p"], "win32")).toEqual({ file: "C:\\bin\\claude.exe", args: ["-p"], verbatim: false });
    expect(buildCommand("/usr/bin/codex", ["exec", "-"], "linux")).toEqual({ file: "/usr/bin/codex", args: ["exec", "-"], verbatim: false });
  });
  it("runs a .cmd shim through cmd.exe with one quoted command string", () => {
    const c = buildCommand("C:\\Users\\me\\AppData\\Roaming\\npm\\gemini.cmd", ["--approval-mode", "plan"], "win32");
    expect(c.file).toBe("cmd.exe");
    expect(c.verbatim).toBe(true);
    expect(c.args).toEqual(["/d", "/s", "/c", '"C:\\Users\\me\\AppData\\Roaming\\npm\\gemini.cmd" --approval-mode plan']);
  });
  it("refuses a shim path or argument that cmd.exe would reinterpret", () => {
    expect(() => buildCommand("C:\\a&b\\x.cmd", ["-p"], "win32")).toThrow();
    expect(() => buildCommand("C:\\a\\x.cmd", ["a b"], "win32")).toThrow();
    expect(() => buildCommand("C:\\a\\x.cmd", ["&calc"], "win32")).toThrow();
  });
  it("does not use cmd.exe for a .cmd path off Windows", () => {
    expect(buildCommand("/x/y.cmd", ["a"], "linux").file).toBe("/x/y.cmd");
  });
});

describe("pure helpers", () => {
  it("pickProgram prefers an exe, then a cmd shim, and skips extensionless scripts on Windows", () => {
    const found = ["C:\\npm\\gemini", "C:\\npm\\gemini.cmd"];
    expect(pickProgram(found, "win32")).toBe("C:\\npm\\gemini.cmd");
    expect(pickProgram(["C:\\a\\x.cmd", "C:\\b\\x.exe"], "win32")).toBe("C:\\b\\x.exe");
    expect(pickProgram(["C:\\npm\\gemini"], "win32")).toBeNull();
    expect(pickProgram(["/usr/bin/codex"], "linux")).toBe("/usr/bin/codex");
    expect(pickProgram([], "linux")).toBeNull();
  });

  it("formatTranscript keeps instructions, roles and order", () => {
    const t = formatTranscript([
      { role: "system", content: "Be brief." },
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
      { role: "user", content: "More" },
    ]);
    expect(t.indexOf("Be brief.")).toBeLessThan(t.indexOf("Learner: Hi"));
    expect(t.indexOf("Learner: Hi")).toBeLessThan(t.indexOf("Assistant: Hello"));
    expect(t.indexOf("Assistant: Hello")).toBeLessThan(t.indexOf("Learner: More"));
  });

  it("lines splits a chunked stream", async () => {
    async function* chunks() {
      yield "a\nb";
      yield "c\n\nd";
    }
    const out: string[] = [];
    for await (const l of lines(chunks())) out.push(l);
    expect(out).toEqual(["a", "bc", "d"]);
  });

  it("claudeStreamText yields the text deltas and ignores everything else", async () => {
    const delta = (t: string) => JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: t } } }) + "\n";
    async function* chunks() {
      yield JSON.stringify({ type: "system", subtype: "init" }) + "\n";
      yield delta("po");
      yield "not json\n";
      yield delta("ng");
      yield JSON.stringify({ type: "result", result: "pong" }) + "\n";
    }
    expect(await collect(claudeStreamText(chunks()))).toBe("pong");
  });

  it("claudeStreamText falls back to the result text and throws on an error result", async () => {
    async function* only() {
      yield JSON.stringify({ type: "result", result: "whole" }) + "\n";
    }
    expect(await collect(claudeStreamText(only()))).toBe("whole");
    async function* bad() {
      yield JSON.stringify({ type: "result", is_error: true, result: "x" }) + "\n";
    }
    await expect(collect(claudeStreamText(bad()))).rejects.toThrow();
  });
});

describe("providers", () => {
  it("knows every id, marks the CLIs as cloud and Ollama as local", () => {
    expect(getProvider("ollama").cloud).toBe(false);
    for (const id of ["claude", "agy", "gemini", "codex"] as const) expect(getProvider(id).cloud).toBe(true);
    expect(() => getProvider("nope" as never)).toThrow();
  });

  it("Antigravity is never offered and refuses to chat", async () => {
    expect((await getProvider("agy").detect()).found).toBe(false);
    await expect(getProvider("agy").chat([], { signal: new AbortController().signal }).next()).rejects.toThrow(/Not offered/);
  });

  it("detectProviders never throws and lists all five", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const list = await detectProviders();
    vi.unstubAllGlobals();
    expect(list.map((p) => p.id)).toEqual(["ollama", "claude", "agy", "gemini", "codex"]);
    expect(list.find((p) => p.id === "agy")!.found).toBe(false);
    expect(list.find((p) => p.id === "ollama")!.found).toBe(false);
  });

});
