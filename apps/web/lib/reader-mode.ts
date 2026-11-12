import { cookies } from "next/headers";

/**
 * Reader mode: a comfort mode for phones. It hides Run, Submit, Check, Reset and "Mark solved" and makes code editors
 * read-only. It is NOT security: the cookie can be edited. Real protection against running code on a hosted server is
 * done on the server (plan 0058).
 */
export const READER_COOKIE = "zd_reader";

/** One year, in seconds. */
export const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Notes stay editable as plain text in reader mode. Change here to lock them as well. */
export const READER_NOTES_EDITABLE = true;

/** True only for the exact value "1". Anything else (missing, "0", junk) is off. */
export function parseReaderCookie(value: string | undefined | null): boolean {
  return value === "1";
}

/** The cookie value to store, or null to delete the cookie (reader mode off is the default). */
export function readerCookieValue(on: boolean): string | null {
  return on ? "1" : null;
}

/**
 * Whether reader mode is on for this request. Cookies are request-time data: call this only inside an async
 * component already behind `await connection()` and a Suspense boundary.
 */
export async function isReaderMode(): Promise<boolean> {
  return parseReaderCookie((await cookies()).get(READER_COOKIE)?.value);
}
