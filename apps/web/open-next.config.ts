import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Hosted Zen Dojo is per-user and fully dynamic (every page asks for the session), so there is nothing worth keeping
// in an incremental cache. Leaving the cache overrides out selects the adapter's dummy cache: no R2 bucket, no KV,
// no self-binding. Reasons and the cacheComponents caveat: docs/hosted-architecture.md.
export default defineCloudflareConfig({});
