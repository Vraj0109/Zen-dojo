import { connection } from "next/server";
import { levelInfo } from "@habit/shared";
import { getSession, hasRefreshCookie } from "@/lib/auth/session";
import { progressNow } from "../today/data";
import { AccountPopover } from "./account-popover";

/** The avatar at the bottom of the rail and its account menu. Reads the session on the server; renewing happens in /auth/refresh. */
export async function SidebarAccount({ compact = false }: { compact?: boolean } = {}) {
  await connection();
  const [session, p] = await Promise.all([getSession(), progressNow().catch(() => null)]);
  const renew = !session && (await hasRefreshCookie());
  const level = p ? { level: levelInfo(p.totalXp).level, xp: p.totalXp } : null;
  return (
    <AccountPopover
      user={session ? { id: session.userId, name: session.name, avatarUrl: session.avatarUrl, admin: session.admin } : null}
      renew={renew}
      compact={compact}
      level={level}
    />
  );
}
