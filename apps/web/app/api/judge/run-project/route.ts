import { runJavaProject } from "@/lib/judge/run-project";

export const maxDuration = 90;

/** True when the request comes from a page served by this same server. */
function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (!origin) return site === "same-origin"; // some browsers omit Origin on same-origin POSTs; Sec-Fetch-Site vouches then
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request) || !(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = await request.text();
  if (text.length > 1_000_000) {
    return Response.json({ error: "The submitted code is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { files, mainClass, input, timeoutMs } = body as Record<string, unknown>;

  const fileMap: Record<string, string> = {};

  if (Array.isArray(files)) {
    for (const item of files) {
      if (typeof item === "object" && item !== null && typeof (item as { name?: unknown }).name === "string" && typeof (item as { content?: unknown }).content === "string") {
        fileMap[(item as { name: string }).name] = (item as { content: string }).content;
      } else {
        return Response.json({ error: "Each file item must have string 'name' and 'content' properties." }, { status: 400 });
      }
    }
  } else if (typeof files === "object" && files !== null) {
    for (const [key, value] of Object.entries(files)) {
      if (typeof key !== "string" || typeof value !== "string") {
        return Response.json({ error: "All file paths and contents must be strings." }, { status: 400 });
      }
      fileMap[key] = value;
    }
  } else {
    return Response.json({ error: "files must be an object or array of { name, content }." }, { status: 400 });
  }

  if (Object.keys(fileMap).length === 0) {
    return Response.json({ error: "No files provided." }, { status: 400 });
  }

  if (mainClass !== undefined && typeof mainClass !== "string") {
    return Response.json({ error: "mainClass must be a string." }, { status: 400 });
  }

  if (input !== undefined && typeof input !== "string") {
    return Response.json({ error: "input must be a string." }, { status: 400 });
  }

  let timeout: number | undefined = undefined;
  if (timeoutMs !== undefined) {
    if (typeof timeoutMs !== "number" || Number.isNaN(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) {
      return Response.json({ error: "timeoutMs must be a number between 100 and 30000." }, { status: 400 });
    }
    timeout = timeoutMs;
  }

  const result = await runJavaProject({
    files: fileMap,
    mainClass: typeof mainClass === "string" ? mainClass : undefined,
    input: typeof input === "string" ? input : undefined,
    timeoutMs: timeout,
  });

  return Response.json({
    ...result,
    ok: result.success,
    stdout: result.output,
    stderr: result.status === "compile_error" ? result.output : "",
    exitCode: result.success ? 0 : 1,
    elapsedMs: result.elapsedMs,
    diagnostics: (result.diagnostics ?? []).map((d) => ({
      ...d,
      severity: "error",
    })),
  });
}
