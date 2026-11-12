import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWorkerUrl } from "@/lib/auth/jwks";
import { hubUrl } from "@/lib/hub/url";
import { checkSameOrigin } from "@/lib/auth/util";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const rt = cookieStore.get("zd_rt")?.value;

  if (rt) {
    try {
      const workerUrl = getWorkerUrl();
      const logoutUrl = hubUrl("/auth/logout", workerUrl);
      await fetch(logoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
    } catch {
      // Swallowed: user should still be logged out locally
    }
  }

  const accept = req.headers.get("accept") ?? "";
  const contentType = req.headers.get("content-type") ?? "";
  const isForm =
    contentType.includes("application/x-www-form-urlencoded") || accept.includes("text/html");

  const res = isForm
    ? NextResponse.redirect(new URL("/login", req.url), 303)
    : NextResponse.json({ ok: true });

  res.cookies.delete("zd_at");
  res.cookies.delete("zd_rt");
  res.cookies.delete("zd_u");

  return res;
}
