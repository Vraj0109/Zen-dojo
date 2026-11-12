import { hostedNoRun } from "@/lib/hosted/no-run";
import { handleInstall } from "@/lib/tools/handlers";

export function POST(req: Request) {
  const blocked = hostedNoRun();
  if (blocked) return blocked;
  return handleInstall(req);
}
