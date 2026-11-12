import { hostedNoRun } from "@/lib/hosted/no-run";
import { handleStatus } from "@/lib/tools/handlers";

export function GET(req: Request) {
  const blocked = hostedNoRun();
  if (blocked) return blocked;
  return handleStatus(req);
}
