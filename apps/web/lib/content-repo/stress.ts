import "server-only";
import type { StressCase } from "@habit/shared";
import { stressFor as registryStressFor } from "@habit/shared/stress-registry";

/**
 * Stress generators are code (packages/shared/src/judge/stress*.ts) and stay there (plan 0114). The registry reads only
 * those files, so this lookup does not load the problem specs. Returns undefined when a problem has no stress
 * generators, so its spec keeps the usual shape.
 */
export function stressFor(id: string): StressCase[] | undefined {
  return registryStressFor(id);
}
