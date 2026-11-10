import "server-only";
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface Diagnostic {
  file: string;
  line: number;
  column?: number;
  message: string;
}

export type ProjectRunStatus = "compiled_and_ran" | "compile_error" | "tle" | "runtime_error";

export interface ProjectRunResult {
  success: boolean;
  status: ProjectRunStatus;
  output: string;
  diagnostics?: Diagnostic[];
  elapsedMs: number;
}

export interface RunJavaProjectOptions {
  files: Record<string, string>;
  mainClass?: string;
  input?: string;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const COMPILE_TIMEOUT_MS = 30000;
const MAX_OUTPUT_CHARS = 500_000;

const tool = (envName: string, fallback: string) => process.env[envName] || fallback;

export function cleanDirFromOutput(text: string, dir: string): string {
  const norm = dir.replace(/\\/g, "/");
  let result = text;
  result = result.replaceAll(dir + path.sep, "");
  result = result.replaceAll(dir + "/", "");
  result = result.replaceAll(dir + "\\", "");
  result = result.replaceAll(norm + "/", "");
  result = result.replaceAll(dir, ".");
  result = result.replaceAll(norm, ".");
  return result.slice(0, MAX_OUTPUT_CHARS);
}

export function parseJavaDiagnostics(
  compilerOutput: string,
  tempDir?: string,
  knownFiles?: string[]
): Diagnostic[] {
  let text = compilerOutput;
  if (tempDir) {
    const norm = tempDir.replace(/\\/g, "/");
    text = text
      .replaceAll(tempDir + path.sep, "")
      .replaceAll(tempDir + "/", "")
      .replaceAll(tempDir + "\\", "")
      .replaceAll(norm + "/", "")
      .replaceAll(tempDir, "")
      .replaceAll(norm, "");
  }

  const lines = text.split(/\r?\n/);
  const diagnostics: Diagnostic[] = [];

  // Matches javac lines like:
  // Main.java:5: error: cannot find symbol
  // model/User.java:12: error: ';' expected
  // C:\...\Main.java:5: error: ...
  // Main.java:5:10: error: ...
  const diagLineRegex = /^(?:[a-zA-Z]:[\\/])?(.*?\.java):(\d+)(?::(\d+))?:\s*(?:(error|warning):\s*)?(.*)$/i;

  let currentDiag: Diagnostic | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const match = rawLine.match(diagLineRegex);

    if (match) {
      if (currentDiag) {
        diagnostics.push(currentDiag);
        currentDiag = null;
      }
      let file = match[1].replace(/\\/g, "/").replace(/^[\\/]+/, "");
      if (knownFiles && knownFiles.length > 0) {
        const found = knownFiles.find(
          (k) => k === file || file.endsWith(k) || k.endsWith(file)
        );
        if (found) file = found;
      }
      const line = parseInt(match[2], 10);
      const col = match[3] ? parseInt(match[3], 10) : undefined;
      const msg = (match[5] || "").trim();

      currentDiag = {
        file,
        line,
        ...(col !== undefined ? { column: col } : {}),
        message: msg,
      };
    } else if (currentDiag) {
      const caretIdx = rawLine.indexOf("^");
      if (caretIdx !== -1 && currentDiag.column === undefined) {
        currentDiag.column = caretIdx + 1;
      }
    }
  }

  if (currentDiag) {
    diagnostics.push(currentDiag);
  }

  return diagnostics;
}

function executeProcess(
  file: string,
  args: string[],
  opts: {
    cwd: string;
    timeoutMs: number;
    input?: string;
    maxOutput?: number;
  }
): Promise<{
  code: number | null;
  signal: string | null;
  output: string;
  timedOut: boolean;
}> {
  return new Promise((resolve) => {
    const maxOutput = opts.maxOutput ?? MAX_OUTPUT_CHARS;
    let output = "";
    let timedOut = false;
    let finished = false;

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(file, args, {
        cwd: opts.cwd,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err: any) {
      resolve({
        code: 1,
        signal: null,
        output: String(err?.message || err),
        timedOut: false,
      });
      return;
    }

    const append = (chunk: Buffer | string) => {
      if (output.length < maxOutput) {
        output += chunk.toString("utf8");
        if (output.length >= maxOutput) {
          output = output.slice(0, maxOutput) + "\n... (output truncated)";
        }
      }
    };

    child.stdout?.on("data", append);
    child.stderr?.on("data", append);

    const killProcessTree = () => {
      if (process.platform === "win32" && child.pid) {
        try {
          execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
        } catch {
          // ignore
        }
      }
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      killProcessTree();
    }, opts.timeoutMs);

    const finish = (code: number | null, signal: string | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve({
        code,
        signal,
        output,
        timedOut,
      });
    };

    child.on("error", (err: NodeJS.ErrnoException) => {
      append(`\nProcess error: ${err.message}`);
      finish(err.code === "ENOENT" ? 127 : 1, null);
    });

    child.on("close", (code, signal) => {
      finish(code, signal);
    });

    if (opts.input !== undefined && opts.input !== "") {
      try {
        child.stdin?.write(opts.input);
        child.stdin?.end();
      } catch {
        // stream might already be closed
      }
    } else {
      try {
        child.stdin?.end();
      } catch {
        // ignore
      }
    }
  });
}

/**
 * Runs a multi-file Java project:
 * 1. Writes all files into an isolated temporary directory.
 * 2. Compiles all .java files with javac.
 * 3. If compilation fails, parses diagnostics (file, line, column, message).
 * 4. If compilation succeeds, runs mainClass (default Main) with memory limit and timeout.
 * 5. Cleans up temp directory on completion.
 */
export async function runJavaProject(options: RunJavaProjectOptions): Promise<ProjectRunResult> {
  const startTime = performance.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const mainClass = options.mainClass || "Main";
  const files = options.files ?? {};
  const fileKeys = Object.keys(files);

  const javaFiles = fileKeys.filter((f) => f.endsWith(".java"));
  if (javaFiles.length === 0) {
    return {
      success: false,
      status: "compile_error",
      output: "No .java files provided to compile.",
      diagnostics: [],
      elapsedMs: 0,
    };
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "lld-run-"));

  try {
    const resolvedDir = path.resolve(dir);

    // Write all files into the workspace directory
    for (const [relPath, content] of Object.entries(files)) {
      const targetPath = path.resolve(dir, relPath);
      if (!targetPath.startsWith(resolvedDir + path.sep) && targetPath !== resolvedDir) {
        return {
          success: false,
          status: "compile_error",
          output: `Security violation: invalid file path "${relPath}".`,
          diagnostics: [],
          elapsedMs: Math.round(performance.now() - startTime),
        };
      }
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, "utf8");
    }

    // Compile with javac
    const javacCmd = tool("HABIT_JAVAC", "javac");
    const javacArgs = ["-encoding", "UTF-8", "-Xlint:all", ...javaFiles];
    const compileResult = await executeProcess(javacCmd, javacArgs, {
      cwd: dir,
      timeoutMs: COMPILE_TIMEOUT_MS,
    });

    if (compileResult.timedOut) {
      return {
        success: false,
        status: "compile_error",
        output: "Compilation timed out.",
        diagnostics: [],
        elapsedMs: Math.round(performance.now() - startTime),
      };
    }

    if (compileResult.code !== 0) {
      const diagnostics = parseJavaDiagnostics(compileResult.output, dir, fileKeys);
      return {
        success: false,
        status: "compile_error",
        output: cleanDirFromOutput(compileResult.output, dir),
        diagnostics,
        elapsedMs: Math.round(performance.now() - startTime),
      };
    }

    // Compilation succeeded, run the java program
    const javaCmd = tool("HABIT_JAVA", "java");
    const javaArgs = ["-Xmx256m", "-cp", ".", mainClass];
    const runResult = await executeProcess(javaCmd, javaArgs, {
      cwd: dir,
      timeoutMs,
      input: options.input,
    });

    const elapsedMs = Math.round(performance.now() - startTime);

    if (runResult.timedOut) {
      return {
        success: false,
        status: "tle",
        output: (runResult.output + "\nTime Limit Exceeded").trim(),
        elapsedMs,
      };
    }

    if (runResult.code !== 0) {
      return {
        success: false,
        status: "runtime_error",
        output: runResult.output.trim() || `Process exited with code ${runResult.code}`,
        elapsedMs,
      };
    }

    return {
      success: true,
      status: "compiled_and_ran",
      output: runResult.output,
      elapsedMs,
    };
  } finally {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore directory cleanup error
    }
  }
}
