import { connection } from "next/server";
import { getSession, hasRefreshCookie } from "@/lib/auth/session";
import { AccountPopover } from "./account-popover";

/** The account area at the bottom of the sidebar. Reads the session on the server; renewing happens in /auth/refresh. */
export async function SidebarAccount() {
  await connection();
  const session = await getSession();
  const renew = !session && (await hasRefreshCookie());
  return (
    <AccountPopover
      user={session ? { id: session.userId, name: session.name, avatarUrl: session.avatarUrl, admin: session.admin } : null}
      renew={renew}
    />
  );
}
