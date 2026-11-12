import { isHosted } from "../hosted";

/**
 * Plan 0058 step 6: the hosted site never starts a program. Call first in every route that spawns one;
 * returns the 403 response in hosted mode, otherwise null.
 */
export function hostedNoRun(): Response | null {
  if (!isHosted()) return null;
  return Response.json(
    { ok: false, error: "hosted-no-run", message: "Running code is available in the desktop app." },
    { status: 403 },
  );
}

/** Plan 0058 step 8: routes for desktop-only features (extension, restoring a database file) are 404 when hosted. */
export function hostedNotFound(): Response | null {
  if (!isHosted()) return null;
  return new Response("Not found", { status: 404 });
}
