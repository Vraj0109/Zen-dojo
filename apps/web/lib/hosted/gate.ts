/**
 * Anonymous visitors on the hosted site (HABIT_HOSTED=1). Nobody has to sign in to use the site: a visitor without an
 * account gets a random id in the `zd_anon` cookie and their own private database (a Durable Object named by that id).
 * Signing in is optional and only adds sync with the desktop app. The id is not an account and carries no identity.
 */
export const ANON_COOKIE = "zd_anon";
export const ANON_MAX_AGE = 60 * 60 * 24 * 365;

const ANON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isAnonId = (v: string | undefined | null): v is string => typeof v === "string" && ANON_ID.test(v);

/** The database owner name for an anonymous visitor. Prefixed so it can never equal an account id (`gh:<number>`). */
export const anonUserId = (id: string): string => `anon:${id}`;

/** True when the request needs a fresh anonymous id: hosted, no session cookie, and no valid anonymous cookie yet. */
export function needsAnonCookie(hosted: boolean, hasSessionCookie: boolean, anonCookie: string | undefined): boolean {
  return hosted && !hasSessionCookie && !isAnonId(anonCookie);
}
