import { restoreBackup } from "@/lib/backup";

const MAX_BACKUP_BYTES = 50_000_000;

const back = (request: Request, params: Record<string, string>) =>
  Response.redirect(new URL(`/settings?${new URLSearchParams(params)}`, request.url), 303);

/**
 * Restore from an uploaded backup (form post from /settings). Only accepted from this app's own pages:
 * a form on another website can't post here and wipe your data.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Restore is only allowed from the HabitManager settings page." }, { status: 403 });
  }
  const form = await request.formData();
  if (form.get("confirm") !== "yes") return back(request, { error: "Tick the box to confirm replacing your data." });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return back(request, { error: "Choose a backup file first." });
  if (file.size > MAX_BACKUP_BYTES) return back(request, { error: "That file is too large to be a HabitManager backup." });

  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return back(request, { error: "That file isn't valid JSON." });
  }
  const result = await restoreBackup(json);
  return result.ok ? back(request, { restored: String(result.rows), ...(result.safetyCopy ? { copy: result.safetyCopy } : {}) }) : back(request, { error: result.error });
}
