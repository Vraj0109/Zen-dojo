// Module hooks that let plain Node (22.18+ or 24+, which strip TypeScript types on their own) import this repo's
// TypeScript: extensionless relative imports get ".ts" / "/index.ts", "@habit/shared" points at the shared package
// source, "@/..." at apps/web, and "server-only" (which throws outside a React server) at an empty module.
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const isFile = (p) => existsSync(p) && statSync(p).isFile();

export async function resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: pathToFileURL(path.join(root, "test", "empty-module.ts")).href, shortCircuit: true };
  if (specifier === "@habit/shared") return { url: pathToFileURL(path.join(root, "packages", "shared", "src", "index.ts")).href, shortCircuit: true };
  let base;
  if (specifier.startsWith("@/")) base = path.join(root, "apps", "web", specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  if (base && !path.extname(base).match(/^\.(m?[jt]s|json)$/)) {
    for (const candidate of [base + ".ts", path.join(base, "index.ts")]) {
      if (isFile(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return next(specifier, context);
}
