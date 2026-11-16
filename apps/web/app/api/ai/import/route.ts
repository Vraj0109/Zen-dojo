import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { defaultGgufFolders, findGgufFiles } from "@/lib/ai/gguf";
import { importGguf, listModels, validModelName } from "@/lib/ai/ollama";
import { getGgufFolders, recordGgufImport } from "@/lib/ui-prefs";

// Plan 0082. Body: { path, name, overwrite? }. Adds a GGUF file to Ollama and streams progress as one JSON object per line
// ({stage, completed, total} / {stage, status} / {stage: "done"} / {error}). Desktop only (404 on the hosted site).
// The path must be one a fresh scan of the saved folders returns; nothing else is read.
export async function POST(req: Request) {
  const s = await guardAi(req);
  if (isResponse(s)) return s;
  let b: { path?: unknown; name?: unknown; overwrite?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    return aiError(400, "bad_request");
  }
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!validModelName(name)) return aiError(400, "bad_model");
  const folders = (await getGgufFolders()) ?? defaultGgufFolders();
  const file = (await findGgufFiles(folders)).find((f) => f.path === b.path);
  if (!file) return aiError(404, "unknown_file");
  if (!file.isGguf) return aiError(400, "not_gguf");
  const installed = await listModels(s.url);
  const exists = installed.some((m) => m === name || m === `${name}:latest`);
  if (exists && b.overwrite !== true) return aiError(409, "name_taken");

  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      const send = (o: unknown) => c.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        for await (const p of importGguf(file.path, name, s.url, abort.signal)) {
          if (p.stage === "done") await recordGgufImport(file.path, name);
          send(p);
        }
      } catch (e) {
        if (!abort.signal.aborted) {
          const msg = e instanceof Error && e.message.startsWith("Ollama") ? e.message : "Could not reach Ollama. Is it running?";
          send({ error: msg });
        }
      }
      try {
        c.close();
      } catch {
        /* already closed */
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
