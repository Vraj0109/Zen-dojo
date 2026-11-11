import "server-only";
import { execFile } from "node:child_process";
import os from "node:os";
import type { Hardware } from "@habit/shared";

/** Parse `nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits`. Uses the largest GPU. Never throws. */
export function parseNvidiaSmi(stdout: string): { name: string; gb: number } | null {
  let best: { name: string; gb: number } | null = null;
  for (const line of String(stdout ?? "").split(/\r?\n/)) {
    const i = line.lastIndexOf(",");
    if (i < 1) continue;
    const name = line.slice(0, i).trim();
    const mib = Number(line.slice(i + 1).trim());
    if (!name || !Number.isFinite(mib) || mib <= 0) continue;
    const gb = mib / 1024;
    if (!best || gb > best.gb) best = { name, gb };
  }
  return best;
}

function nvidiaSmi(): Promise<string> {
  return new Promise((resolve) => {
    try {
      execFile(
        "nvidia-smi",
        ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
        { timeout: 3000, windowsHide: true, maxBuffer: 64 * 1024 },
        (err, stdout) => resolve(err ? "" : String(stdout)),
      );
    } catch {
      resolve("");
    }
  });
}

/** Memory and graphics card of this computer. A missing nvidia-smi is normal. Never throws. */
export async function detectHardware(): Promise<Hardware> {
  let ramGb = 0;
  try {
    ramGb = os.totalmem() / 1024 ** 3;
  } catch {
    ramGb = 0;
  }
  const appleSilicon = process.platform === "darwin" && process.arch === "arm64";
  const gpu = appleSilicon ? null : parseNvidiaSmi(await nvidiaSmi());
  return { ramGb: Math.round(ramGb * 10) / 10, gpuGb: gpu ? Math.round(gpu.gb * 10) / 10 : null, gpuName: gpu?.name, appleSilicon };
}
