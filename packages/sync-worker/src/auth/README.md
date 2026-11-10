# Worker auth (plan 0049, agent A)

Self-contained: only WebCrypto and `fetch`, no imports from `src/guard` or `src/index.ts`.

## Exports (`routes.ts`)

- `handleAuth(req, env, ctx, deps?)`: handles `/auth/*` and `/.well-known/jwks.json`; returns `null` for any other path.
  `deps` is optional: `{ noteAuthFailure, fetch, now }`. The integrator passes guard's function, for example
  `handleAuth(req, env, ctx, { noteAuthFailure })`. Without it, failures are simply not reported.
- `verifyAccessToken(token, env)`: `{ sub, sid, adm } | null`. No D1 access (hot path).

## Secrets and vars

| Name | Kind | Meaning |
|---|---|---|
| `GITHUB_CLIENT_ID` | secret (or var) | GitHub OAuth app client id |
| `GITHUB_CLIENT_SECRET` | secret | GitHub OAuth app client secret |
| `JWT_PRIVATE_JWK` | secret | ES256 (P-256) private key as JWK JSON, includes `d` |
| `JWT_PUBLIC_JWK` | var | The matching public key as JWK JSON (`kty`, `crv`, `x`, `y`) |
| `ADMIN_USER_IDS` | var | Comma list, for example `gh:12345,gh:67890` |
| `ALLOWED_REDIRECTS` | var, optional | Comma list of extra exact redirect URLs (loopback `/auth/callback` is always allowed) |

D1 binding: `DB` with `migrations/0002_auth.sql` applied.

## Notes

- Refresh tokens are 256-bit random values; only the SHA-256 hash is stored. Each use rotates the token. Presenting an
  already-rotated token revokes that device session.
- A refresh with an invalid, revoked or expired token returns `401 { ok:false, error:"invalid_grant" }`.
  A bad authorization code or PKCE verifier returns `400 invalid_grant`.
- Access tokens are not checked against D1, so revoking a device takes effect when its access token expires (15 minutes).
- The GitHub access token is used once to read the profile and is never stored.
