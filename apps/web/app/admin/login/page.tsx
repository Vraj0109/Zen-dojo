import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

const COOKIE = "zen_admin_session";

function token(secret: string): string {
  return createHmac("sha256", secret).update("zen-dojo-admin-session-v1").digest("hex");
}

/** Constant-time compare: hash both sides to equal length first so length is not leaked either. */
function secretMatches(input: string, secret: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

async function login(formData: FormData) {
  "use server";
  const secret = process.env.ADMIN_SECRET;
  if (!secret) redirect("/admin/login?error=locked");
  const given = formData.get("secret");
  if (typeof given !== "string" || given.length === 0 || given.length > 512 || !secretMatches(given, secret)) {
    redirect("/admin/login?error=1");
  }
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, token(secret), {
    httpOnly: true,
    sameSite: "strict",
    secure,
    path: "/admin",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

async function logout() {
  "use server";
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
  redirect("/admin/login");
}

async function LoginBody({ errorParam }: { errorParam: Promise<string | string[] | undefined> }) {
  await connection();
  const error = await errorParam;
  const secret = process.env.ADMIN_SECRET;
  const value = (await cookies()).get(COOKIE)?.value;
  if (secret && value) {
    const expected = token(secret);
    if (value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected))) {
      return (
        <div className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-6">
          <p className="text-sm">You are signed in.</p>
          <div className="flex gap-3">
            <a href="/admin" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent">Open dashboard</a>
            <form action={logout}>
              <button type="submit" className="rounded-md border border-line px-4 py-2 text-sm hover:bg-background">Sign out</button>
            </form>
          </div>
        </div>
      );
    }
  }
  if (!secret) {
    return (
      <div className="max-w-xl space-y-3 rounded-xl border border-line bg-surface p-6 text-sm">
        <h2 className="text-base font-semibold">The admin portal is locked</h2>
        <p className="text-muted">
          No admin secret is configured. Set the <code className="font-mono">ADMIN_SECRET</code> environment variable to a long random
          value (at least 16 characters) and restart the app. For example, in <code className="font-mono">apps/web/.env.local</code>:
        </p>
        <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">ADMIN_SECRET=your-long-random-value</pre>
      </div>
    );
  }
  return (
    <form action={login} className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-6">
      <div>
        <label htmlFor="secret" className="mb-1 block text-sm font-medium">Admin secret</label>
        <input
          id="secret"
          name="secret"
          type="password"
          required
          autoComplete="off"
          autoFocus
          className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm"
        />
      </div>
      {error ? <p role="alert" className="text-sm text-diff-hard">That secret did not match.</p> : null}
      <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent">Sign in</button>
    </form>
  );
}

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Admin sign in</h1>
      <Suspense fallback={<div className="h-40 max-w-md rounded-xl border border-line bg-surface" />}>
        <LoginBody errorParam={searchParams.then((s) => s.error)} />
      </Suspense>
    </main>
  );
}
