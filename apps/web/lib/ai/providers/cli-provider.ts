import "server-only";
import type { AiProvider, AiProviderId } from "./index";
import { lines, resolveProgram, runCli, formatTranscript } from "./cli";

// Plan 0067: turns a fixed command description into an AiProvider. One small file per tool supplies the description.

export interface CliSpec {
  id: Exclude<AiProviderId, "ollama">;
  label: string;
  /** The program name looked up with where/which. A constant. */
  program: string;
  /** The FIXED argument list (no request data, ever). The prompt goes on stdin. */
  args: string[];
  /** How stdout is read: plain text, or Claude Code's stream-json lines. */
  output: "text" | "claude-stream-json";
}

/** Pure. Reads Claude Code `--output-format stream-json --include-partial-messages` lines and yields the text pieces. */
export async function* claudeStreamText(input: AsyncIterable<string>): AsyncGenerator<string> {
  let gotDelta = false;
  for await (const line of lines(input)) {
    let obj: Record<string, unknown>;
    try {
      const v = JSON.parse(line);
      if (!v || typeof v !== "object") continue;
      obj = v as Record<string, unknown>;
    } catch {
      continue;
    }
    if (obj.type === "stream_event") {
      const ev = obj.event as { type?: unknown; delta?: { type?: unknown; text?: unknown } } | undefined;
      if (ev?.type === "content_block_delta" && ev.delta?.type === "text_delta" && typeof ev.delta.text === "string" && ev.delta.text) {
        gotDelta = true;
        yield ev.delta.text;
      }
    } else if (obj.type === "result") {
      if (obj.is_error === true) throw new Error("The AI tool reported an error.");
      if (!gotDelta && typeof obj.result === "string" && obj.result) yield obj.result;
    }
  }
}

export function cliProvider(spec: CliSpec): AiProvider {
  return {
    id: spec.id,
    label: spec.label,
    cloud: true,
    async detect() {
      const found = await resolveProgram(spec.program);
      return found ? { found: true, detail: found } : { found: false, detail: `${spec.program} was not found on this computer` };
    },
    async *chat(messages, opts) {
      const file = await resolveProgram(spec.program);
      if (!file) throw new Error(`${spec.label} is not installed on this computer.`);
      const raw = runCli({ file, args: spec.args, input: formatTranscript(messages), signal: opts.signal });
      yield* spec.output === "claude-stream-json" ? claudeStreamText(raw) : raw;
    },
  };
}
