/** Paths a signed-out visitor may open on the hosted site. Everything else redirects to /welcome. */
export function isPublicHostedPath(pathname: string): boolean {
  return (
    pathname === "/welcome" ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") || // route handlers answer 401 themselves (requireUserDb)
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt"
  );
}

/** True when the request should go to /welcome: hosted, not a public path, and no session cookie at all. */
export function shouldRedirectToWelcome(hosted: boolean, pathname: string, hasSessionCookie: boolean): boolean {
  return hosted && !hasSessionCookie && !isPublicHostedPath(pathname);
}
