import "server-only";
import { cache } from "react";
import { getSession } from "@/lib/auth/session";
import { createGuestDb, getDbFor } from "@/lib/db";

/** One throwaway in-memory database per request for visitors who are not signed in (React's cache is per request). */
const guestDb = cache(() => createGuestDb());

/**
 * The current visitor's database. A signed-in user gets their own Turso database. Anyone else gets an empty in-memory
 * database that lives for one request: they can read and browse everything, and nothing is saved until they sign in
 * (the free Turso plan only has room for a limited number of databases, so guests do not get one).
 */
export async function requireUserDb() {
  const session = await getSession();
  // Signed in, and the Turso settings exist: their own database. Without those settings (not set up yet) everyone is a guest.
  if (session && process.env.TURSO_API_TOKEN && process.env.CONTROL_DATABASE_URL) return getDbFor(session.userId);
  return guestDb();
}
