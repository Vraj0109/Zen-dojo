import { handleStatus } from "@/lib/tools/handlers";

export function GET(req: Request) {
  return handleStatus(req);
}
