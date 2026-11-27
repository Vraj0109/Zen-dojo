// Guard for the local-only sync route (plan 0115 step 5). Pure: reads headers only.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * True when the request was addressed to this machine and did not pass through a proxy. The desktop server listens on
 * 127.0.0.1 only (apps/desktop/main.js), so another machine cannot reach it; this also refuses a request whose Host
 * is not local, carries forwarding headers, or comes from another site (a web page on another origin).
 */
export function isLocalRequest(request: Request): boolean {
  const host = (request.headers.get("host") ?? new URL(request.url).host).toLowerCase();
  const hostname = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  if (!LOCAL_HOSTS.has(hostname)) return false;
  if (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.headers.get("forwarded")) return false;
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}
