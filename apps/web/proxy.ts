import { NextResponse, type NextRequest } from "next/server";
import { shouldRedirectToWelcome } from "@/lib/hosted/gate";

/** Hosted mode only (HABIT_HOSTED=1): signed-out visitors go to /welcome. Pages still verify the session themselves. */
export function proxy(request: NextRequest) {
  const hasCookie = Boolean(request.cookies.get("zd_at") || request.cookies.get("zd_rt"));
  if (shouldRedirectToWelcome(process.env.HABIT_HOSTED === "1", request.nextUrl.pathname, hasCookie)) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
