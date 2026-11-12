import "server-only";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getDbFor } from "@/lib/db";
import { ANON_COOKIE, anonUserId, isAnonId } from "./gate";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Sign in to continue");
  }
}

/**
 * The current visitor's database client. A signed-in user gets their account's database; anyone else gets the private
 * database named by their anonymous cookie. Throws a 401 error only when there is neither (no cookie support).
 */
export async function requireUserDb() {
  const session = await getSession();
  if (session) return getDbFor(session.userId);
  const anon = (await cookies()).get(ANON_COOKIE)?.value;
  if (isAnonId(anon)) return getDbFor(anonUserId(anon));
  throw new UnauthorizedError();
}
