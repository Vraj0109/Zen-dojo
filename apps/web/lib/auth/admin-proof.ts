// The type that proves a server-side admin check passed (plan 0113). Only `lib/auth/admin.ts` creates values of it
// (through `mintAdminProof`, which nothing else may call); write paths such as `getContentWriteDb(proof)` require one.
// Owned by the lead: kept apart from admin.ts so the content DB and the admin checks can be built in parallel.

declare const adminProofBrand: unique symbol;

export type AdminProof = {
  readonly userId: string;
  readonly name: string;
  readonly [adminProofBrand]: true;
};

// Every proof ever minted is remembered here, so a look-alike object ({ userId, name }, frozen or not) is never
// accepted: only objects created by mintAdminProof pass isAdminProof.
const minted = new WeakSet<object>();

/** Internal: only lib/auth/admin.ts and tests call this. */
export function mintAdminProof(userId: string, name: string): AdminProof {
  const proof = Object.freeze({ userId, name });
  minted.add(proof);
  return proof as AdminProof;
}

export function isAdminProof(v: unknown): v is AdminProof {
  return !!v && typeof v === "object" && minted.has(v);
}
