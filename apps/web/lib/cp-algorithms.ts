import "server-only";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CP_ALGO_ARTICLES } from "@habit/shared";
import { toLang } from "./code-lang";
import { highlight } from "./highlight";

// Reads the cp-algorithms articles imported by `pnpm import:cp-algorithms` (apps/web/content/cp-algorithms).
// The text is CC BY-SA 4.0; credit and licence are shown with it (see NOTICE.md in that folder).

export interface CpAlgoArticle {
  path: string;
  title: string;
  html: string;
  sourceUrl: string;
}

const CONTENT = path.join("content", "cp-algorithms");

/** The content folder: next to the web app (dev, `next start`, desktop standalone) or under the repo root (tests). */
function contentDir(): string | null {
  const candidates = [path.join(process.cwd(), CONTENT), path.join(process.cwd(), "apps", "web", CONTENT)];
  return candidates.find((c) => existsSync(c)) ?? null;
}

const decode = (s: string) => s.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", String.fromCharCode(34)).replaceAll("&#39;", "'").replaceAll("&amp;", "&");

/** Replaces the plain `<pre><code class="language-x">` blocks from the import with the app's coloured code blocks. */
async function colourCode(html: string): Promise<string> {
  const re = /<pre><code(?: class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;
  const blocks = [...html.matchAll(re)];
  const coloured = await Promise.all(blocks.map((m) => highlight(decode(m[2]), toLang(m[1]))));
  let i = 0;
  return html.replace(re, () => coloured[i++]);
}

const cache = new Map<string, CpAlgoArticle | null>();

async function loadArticle(articlePath: string): Promise<CpAlgoArticle | null> {
  if (cache.has(articlePath)) return cache.get(articlePath) ?? null;
  let article: CpAlgoArticle | null = null;
  const dir = contentDir();
  if (dir) {
    try {
      const raw = JSON.parse(await readFile(path.join(dir, articlePath.replaceAll("/", "__") + ".json"), "utf8"));
      if (typeof raw.html === "string" && typeof raw.title === "string") {
        article = { path: articlePath, title: raw.title, html: await colourCode(raw.html), sourceUrl: String(raw.sourceUrl ?? "") };
      }
    } catch {
      article = null;
    }
  }
  cache.set(articlePath, article);
  return article;
}

/** Articles mapped to a pattern, in mapping order. Missing files are skipped, so this never throws. */
export async function getCpAlgoArticles(patternId: string): Promise<CpAlgoArticle[]> {
  const paths = CP_ALGO_ARTICLES[patternId] ?? [];
  const loaded = await Promise.all(paths.map(loadArticle));
  return loaded.filter((a): a is CpAlgoArticle => a !== null);
}

/** How many articles a pattern has, without reading them (for the tab label). */
export function cpAlgoCount(patternId: string): number {
  return (CP_ALGO_ARTICLES[patternId] ?? []).length;
}
