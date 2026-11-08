import { JUDGE_LANGS, JUDGE_LANG_LABEL, JUDGE_PROBLEMS, type JudgeLang } from "@habit/shared";
import { JUDGE_LIMITS, runCode } from "@/lib/judge/run";
import { saveSolution } from "@/lib/notes";
import { getPackProblemSpec, setPackItemDone } from "@/lib/packs";

// Runs your code on a problem's tests (the Run button). This executes code on this computer, so it only accepts
// requests made by this app's own pages: same origin, and a JSON body (which a plain cross-site form cannot send).
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
  if (text.length > JUDGE_LIMITS.code + 1000) return Response.json({ error: "The code is too long." }, { status: 413 });
  let body: { id?: unknown; lang?: unknown; code?: unknown; save?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const isPack = typeof body.id === "string" && body.id.startsWith("pack:");
  const spec = typeof body.id === "string" ? (isPack ? ((await getPackProblemSpec(body.id)) ?? undefined) : JUDGE_PROBLEMS[body.id]) : undefined;
  const lang = JUDGE_LANGS.find((l) => l === body.lang) as JudgeLang | undefined;
  if (!spec || !lang || typeof body.code !== "string") return Response.json({ error: "Unknown problem, language or code." }, { status: 400 });
  const result = await runCode(spec, lang, body.code);
  // Imported (pack) problems: passing every test marks the problem done in its course.
  if (isPack && result.status === "done" && result.total > 0 && result.passed === result.total) {
    const [, packId, itemId] = spec.id.split(":");
    await setPackItemDone(packId, itemId, true);
    return Response.json(result);
  }
  // When every test passes, keep the solution with the problem (only the code; your notes are not touched).
  if (body.save === true && result.status === "done" && result.total > 0 && result.passed === result.total) {
    await saveSolution(spec.id, body.code, JUDGE_LANG_LABEL[lang]);
    return Response.json({ ...result, saved: true });
  }
  return Response.json(result);
}
