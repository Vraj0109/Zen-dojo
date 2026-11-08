import { ALL_EXERCISES, studyHref } from "@habit/shared";
import { DIAGRAM_LIMITS, addDiagram } from "@/lib/diagrams";

/**
 * Add a diagram (form post from a design / LLD page). A route handler rather than a server action
 * because images can be larger than the server-action body limit. Same-origin only.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Diagrams can only be added from Zen Dojo's own pages." }, { status: 403 });
  }
  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > DIAGRAM_LIMITS.bytes + 100_000) return Response.json({ error: "Too large" }, { status: 413 });

  const form = await request.formData();
  const itemId = String(form.get("itemId") ?? "");
  const exercise = ALL_EXERCISES[itemId];
  if (!exercise) return Response.json({ error: "Unknown design or problem." }, { status: 400 });

  const file = form.get("file");
  const image = file instanceof File && file.size > 0 ? new Uint8Array(await file.arrayBuffer()) : null;
  const result = await addDiagram({ itemId, title: String(form.get("title") ?? ""), url: String(form.get("url") ?? ""), image });
  const back = new URL(studyHref(exercise.area, itemId), request.url);
  if (!result.ok) back.searchParams.set("diagramError", result.error);
  back.hash = "diagrams";
  return Response.redirect(back, 303);
}
