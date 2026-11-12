import { DurableObject } from "cloudflare:workers";
import { UserDbCore, type UserDbStorage, type WireResult, type WireStatement } from "./user-db-core";

/**
 * One SQLite-backed Durable Object per signed-in user: the user's whole Zen Dojo database (plan 0058). The Worker
 * reaches it by `env.USER_DB.get(env.USER_DB.idFromName(userId))`, so the object id is derived from the user id and
 * there is no control database and no provisioning call. All logic is in user-db-core.ts (tested in Node).
 * Public methods are RPC methods: arguments and results must be structured-cloneable.
 */
export class UserDb extends DurableObject {
  private readonly core: UserDbCore;

  constructor(ctx: import("cloudflare:workers").DurableObjectState, env: unknown) {
    super(ctx, env);
    this.core = new UserDbCore(ctx.storage as unknown as UserDbStorage);
  }

  exec(stmt: WireStatement): WireResult {
    return this.core.exec(stmt);
  }
  batch(stmts: WireStatement[]): WireResult[] {
    return this.core.batch(stmts);
  }
  execMulti(script: string): void {
    this.core.execMulti(script);
  }
  schemaVersion(): number {
    return this.core.schemaVersion();
  }
  migrate(migrations: string[]): number {
    return this.core.migrate(migrations);
  }
  /** Delete-my-data: drop every table, then clear all storage so the object ceases to exist once idle. */
  async dropAll(): Promise<{ dropped: number }> {
    const r = this.core.dropAll();
    await this.ctx.storage.deleteAll();
    return r;
  }
}
