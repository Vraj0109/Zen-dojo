import { ALL_CONCEPTS } from "@habit/shared";

// Pure form parsing for the admin lesson editor (plan 0045). Kept out of the "use server" file, which may only export actions.

const MAX_ENTRY = 8000;
const MAX_LIST = 60;

function texts(fd: FormData, name: string): string[] {
  return fd
    .getAll(name)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.replace(/\r\n/g, "\n").trim());
}

/** Builds the patch item from the form. Empty questions and pitfalls are dropped; explain keeps its slots (one per checklist point). */
export function buildLessonPatch(fd: FormData): { ok: true; item: Record<string, unknown>; concept: string } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const concept = String(fd.get("concept") ?? "").trim();
  if (!Object.hasOwn(ALL_CONCEPTS, concept)) errors.push("Unknown lesson.");
  const overview = String(fd.get("overview") ?? "").replace(/\r\n/g, "\n").trim();
  if (!overview) errors.push("The overview is required.");
  const explain = texts(fd, "explain");
  const questions = texts(fd, "questions").filter(Boolean);
  const pitfalls = texts(fd, "pitfalls").filter(Boolean);
  if (explain.length === 0 || explain.some((e) => !e)) errors.push("Every checklist point needs an explanation.");
  for (const [label, list] of [["explanation", explain], ["question", questions], ["pitfall", pitfalls]] as const) {
    if (list.length > MAX_LIST) errors.push(`At most ${MAX_LIST} ${label}s.`);
    if (list.some((s) => s.length > MAX_ENTRY)) errors.push(`Each ${label} is up to ${MAX_ENTRY} characters.`);
  }
  if (overview.length > MAX_ENTRY) errors.push(`The overview is up to ${MAX_ENTRY} characters.`);
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    concept,
    item: { type: "patch", id: concept, concept, replace: { overview, explain, questions, ...(pitfalls.length > 0 ? { pitfalls } : {}) } },
  };
}
