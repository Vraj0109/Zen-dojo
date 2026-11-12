import { hostedNoRun } from "@/lib/hosted/no-run";
import { handleRemove } from "@/lib/tools/handlers";

export function POST(req: Request) {
  const blocked = hostedNoRun();
  if (blocked) return blocked;
  return handleRemove(req);
}
