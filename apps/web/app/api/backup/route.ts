import { connection } from "next/server";
import { backupFileName, exportBackup } from "@/lib/backup";

/** Download all your data as one JSON file. */
export async function GET() {
  await connection(); // always export the current data, never a build-time copy
  return new Response(JSON.stringify(await exportBackup(), null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backupFileName()}"`,
      "Cache-Control": "no-store",
    },
  });
}
