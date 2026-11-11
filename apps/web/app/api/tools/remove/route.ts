import { handleRemove } from "@/lib/tools/handlers";

export function POST(req: Request) {
  return handleRemove(req);
}
