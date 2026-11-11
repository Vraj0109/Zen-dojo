import { createHash } from "node:crypto";
import fs from "node:fs";
import { Readable } from "node:stream";
import { MAX_REDIRECTS, allowedHosts, sizeCap, verifyPlan, type CatalogEntry } from "@habit/shared";

/** An error whose message is safe to show to the learner as it is. */
export class ToolError extends Error {
  constructor(
    message: string,
    readonly code: "bad_entry" | "host" | "redirects" | "http" | "too_large" | "hash" | "aborted" | "network",
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export interface DownloadOptions {
  fetch?: typeof fetch;
  onProgress?: (received: number, total: number) => void;
  signal?: AbortSignal;
}

function removeQuietly(file: string): void {
  try {
    fs.rmSync(file, { force: true });
  } catch {
    // nothing more to do
  }
}

/**
 * Downloads entry.url to destFile (a ".part" file) and checks size and SHA-256. HTTPS only, every hop (at most 3 redirects)
 * must be on the allowed host list, the file may not be larger than the catalogue size plus 5 percent. On any failure the
 * file is deleted. The URL always comes from the catalogue, never from a request.
 */
export async function downloadVerified(entry: CatalogEntry, destFile: string, opts: DownloadOptions = {}): Promise<void> {
  const doFetch = opts.fetch ?? fetch;
  const problems = verifyPlan(entry);
  if (problems.length > 0) throw new ToolError("This download entry is not valid, so nothing was downloaded.", "bad_entry");
  const hosts = allowedHosts(entry);
  const cap = sizeCap(entry);

  try {
    let url = entry.url;
    let res: Response | null = null;
    for (let hop = 0; ; hop++) {
      const u = new URL(url);
      if (u.protocol !== "https:" || !hosts.includes(u.hostname.toLowerCase())) {
        throw new ToolError("The download went to a server that is not on the allowed list, so it was stopped.", "host");
      }
      try {
        res = await doFetch(url, { redirect: "manual", signal: opts.signal });
      } catch (e) {
        if (opts.signal?.aborted || (e instanceof Error && e.name === "AbortError")) throw new ToolError("The download was cancelled.", "aborted");
        throw new ToolError("The download could not start. Check your internet connection and try again.", "network");
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel().catch(() => undefined);
        if (!loc) throw new ToolError("The server sent a redirect without a place to go.", "http");
        if (hop >= MAX_REDIRECTS) throw new ToolError("The download was redirected too many times, so it was stopped.", "redirects");
        url = new URL(loc, url).toString();
        continue;
      }
      break;
    }
    if (!res.ok || !res.body) throw new ToolError(`The server answered ${res.status}, so nothing was downloaded.`, "http");

    const declared = Number(res.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > cap) throw new ToolError("The file is larger than expected, so it was stopped.", "too_large");

    const hash = createHash("sha256");
    const out = fs.createWriteStream(destFile);
    let received = 0;
    try {
      const body = Readable.fromWeb(res.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>);
      for await (const chunk of body as AsyncIterable<Buffer>) {
        received += chunk.length;
        if (received > cap) throw new ToolError("The file is larger than expected, so it was stopped.", "too_large");
        hash.update(chunk);
        if (!out.write(chunk)) await new Promise<void>((r) => out.once("drain", () => r()));
        opts.onProgress?.(received, entry.bytes);
      }
    } catch (e) {
      await new Promise<void>((r) => {
        out.once("close", () => r());
        out.destroy();
      });
      if (e instanceof ToolError) throw e;
      if (opts.signal?.aborted || (e instanceof Error && e.name === "AbortError")) throw new ToolError("The download was cancelled.", "aborted");
      throw new ToolError("The download was interrupted. Check your internet connection and try again.", "network");
    }
    await new Promise<void>((resolve, reject) => {
      out.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    if (received !== entry.bytes) throw new ToolError("The downloaded file has the wrong size, so it was not used.", "hash");
    if (hash.digest("hex") !== entry.sha256) {
      throw new ToolError("The downloaded file does not match its published checksum, so it was deleted and not used.", "hash");
    }
  } catch (e) {
    removeQuietly(destFile);
    throw e;
  }
}
