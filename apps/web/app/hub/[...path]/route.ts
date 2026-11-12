import { hubFetch } from "@/lib/hub/handler";

// The sync Worker's routes (sign-in, sync, public profile) served by the site under /hub (plan 0073).
// No route segment `dynamic` option: cacheComponents forbids it, and handlers that read the request are dynamic anyway.
export const maxDuration = 60;

function handle(request: Request): Promise<Response> {
  return hubFetch(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
