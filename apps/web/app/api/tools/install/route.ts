import { handleInstall } from "@/lib/tools/handlers";

export function POST(req: Request) {
  return handleInstall(req);
}
