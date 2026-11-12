// Minimal types for the Workers-only module used by user-do.ts, so the web app typechecks without
// @cloudflare/workers-types (which would clash with the DOM lib the Next app uses).
declare module "cloudflare:workers" {
  export interface DurableObjectState {
    storage: { deleteAll(): Promise<void> } & Record<string, unknown>;
  }
  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectState, env: Env);
    protected ctx: DurableObjectState;
    protected env: Env;
  }
}
