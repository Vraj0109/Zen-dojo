import type { Client } from "@libsql/client";

export function splitStatements(text: string): string[];
export function parseDump(text: string): {
  byTable: Map<string, { columns: string[] | null; rows: unknown[][]; table?: string }>;
  skipped: string[];
};
export function importDump(
  client: Client,
  text: string,
): Promise<{ counts: Record<string, number>; imported: Record<string, number>; skipped: string[] }>;
