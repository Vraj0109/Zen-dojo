import "server-only";
import { getSession } from "@/lib/auth/session";
import { getDbFor } from "@/lib/db";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Sign in to continue");
  }
}

/** The signed-in user's database client; throws a 401 error when nobody is signed in. */
export async function requireUserDb() {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return getDbFor(session.userId);
}
