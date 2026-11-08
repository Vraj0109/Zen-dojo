import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import { marked } from "marked";
import { CP_ALGO_ARTICLES, cpAlgoUrl } from "../packages/shared/src/cp-algorithms.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(REPO_ROOT, "apps", "web", "content", "cp-algorithms");

const USER_AGENT = "Zen Forge-importer";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "User-Agent": USER_AGENT,
          ...(options.headers || {}),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(500);
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let commit = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--commit" && args[i + 1]) {
      commit = args[i + 1];
      i++;
    } else if (args[i].startsWith("--commit=")) {
      commit = args[i].slice("--commit=".length);
    }
  }
  return { commit };
}

async function resolveCommit(specifiedCommit) {
  if (specifiedCommit) {
    console.log(`Using specified commit: ${specifiedCommit}`);
    return specifiedCommit;
  }
  console.log("Fetching latest commit SHA from cp-algorithms/cp-algorithms...");
  const res = await fetchWithRetry(
    "https://api.github.com/repos/cp-algorithms/cp-algorithms/commits/main"
  );
  const data = await res.json();
  console.log(`Latest commit SHA: ${data.sha}`);
  return data.sha;
}

function parseFrontMatter(text) {
  let tags = [];
  let eMaxxLink = undefined;
  let body = text;

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (match) {
    const yaml = match[1];
    body = text.slice(match[0].length);

    const tagsMatch = yaml.match(
      /tags:\s*(?:\[([^\]]*)\]|(?:\r?\n\s*-\s*[^\r\n]+)+)/
    );
    if (tagsMatch) {
      if (tagsMatch[1] !== undefined) {
        tags = tagsMatch[1]
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else {
        const itemMatches = tagsMatch[0].matchAll(/^\s*-\s*([^\r\n]+)/gm);
        for (const im of itemMatches) {
          tags.push(im[1].trim().replace(/^['"]|['"]$/g, ""));
        }
      }
    }

    const emMatch = yaml.match(/e_maxx_link:\s*([^\r\n]+)/);
    if (emMatch) {
      eMaxxLink = emMatch[1].trim();
    }
  }

  return { tags, eMaxxLink, body };
}

function convertAdmonitions(text) {
  const lines = text.split(/\r?\n/);
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^(\?\?\?|!!!)\s+([a-zA-Z0-9_-]+)(?:\s+"([^"]+)")?/);
    if (match) {
      const type = match[1]; // "???" or "!!!"
      const tag = match[2];
      const title = match[3] || tag;
      const bodyLines = [];
      i++;

      while (i < lines.length) {
        const cur = lines[i];
        if (cur.trim() === "") {
          bodyLines.push("");
          i++;
        } else if (/^( {4}|\t)/.test(cur)) {
          bodyLines.push(cur.replace(/^( {4}|\t)/, ""));
          i++;
        } else {
          break;
        }
      }

      // Trim trailing blank lines from body
      while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === "") {
        bodyLines.pop();
      }

      const bodyText = bodyLines.join("\n");
      if (type === "???") {
        output.push(`<details class="my-4 rounded-lg border border-line bg-surface/50 p-3"><summary class="cursor-pointer font-medium">${title}</summary>\n\n${bodyText}\n\n</details>`);
      } else {
        output.push(`<aside class="my-4 rounded-lg border border-line bg-surface/50 p-3"><p class="font-semibold mb-2">${title}</p>\n\n${bodyText}\n\n</aside>`);
      }
    } else {
      output.push(line);
      i++;
    }
  }

  return output.join("\n");
}

function normalizeCodeFences(text) {
  // Normalize ```{.cpp file=x} to ```cpp
  return text.replace(/^```\{\.([a-zA-Z0-9_-]+)[^\n}]*\}/gm, "```$1");
}

function processMathAndMarkdown(markdown, articlePath) {
  // 1. Protect code spans and blocks from math replacement
  const codeBlocks = [];
  let protectedMd = markdown.replace(
    /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g,
    (match) => {
      const idx = codeBlocks.length;
      codeBlocks.push(match);
      return `XCODEBLOCKPH${idx}X`;
    }
  );

  // 2. Extract math
  const mathItems = [];
  // Block math $$...$$
  protectedMd = protectedMd.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    const idx = mathItems.length;
    let html = "";
    try {
      html = katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      html = `<code>${tex}</code>`;
    }
    mathItems.push({ html, display: true });
    return `XKATEXMATHPH${idx}X`;
  });

  // Inline math $...$
  protectedMd = protectedMd.replace(/(?<!\\)\$([^\$\n]+?)(?<!\\)\$/g, (_, tex) => {
    const idx = mathItems.length;
    let html = "";
    try {
      html = katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: "ignore",
      });
    } catch {
      html = `<code>${tex}</code>`;
    }
    mathItems.push({ html, display: false });
    return `XKATEXMATHPH${idx}X`;
  });

  // 3. Restore code blocks
  protectedMd = protectedMd.replace(/XCODEBLOCKPH(\d+)X/g, (_, idx) => {
    return codeBlocks[Number(idx)];
  });

  // 4. Normalize code fences
  protectedMd = normalizeCodeFences(protectedMd);

  // 5. Convert admonitions
  protectedMd = convertAdmonitions(protectedMd);

  // 6. Convert Markdown to HTML with marked
  let html = marked.parse(protectedMd);

  // 7. Substitute math back
  html = html.replace(/XKATEXMATHPH(\d+)X/g, (_, idx) => {
    const item = mathItems[Number(idx)];
    return item ? item.html : "";
  });

  // 8. Rewrite relative image src and article links to absolute https://cp-algorithms.com/ URLs
  const baseUrl = `https://cp-algorithms.com/${articlePath}.html`;

  function resolveCpUrl(relative) {
    if (!relative) return relative;
    if (
      relative.startsWith("#") ||
      relative.startsWith("http://") ||
      relative.startsWith("https://") ||
      relative.startsWith("//") ||
      relative.startsWith("data:") ||
      relative.startsWith("mailto:")
    ) {
      return relative;
    }
    // If it's a markdown link to another article, rewrite .md to .html
    const normalized = relative.replace(/\.md(#.*)?$/, ".html$1");
    try {
      return new URL(normalized, baseUrl).href;
    } catch {
      return relative;
    }
  }

  // Rewrite <a href="...">
  html = html.replace(
    /(<a\s+[^>]*?href=["'])([^"']+)(["'][^>]*>)/gi,
    (_, prefix, href, suffix) => `${prefix}${resolveCpUrl(href)}${suffix}`
  );

  // Rewrite <img src="...">
  html = html.replace(
    /(<img\s+[^>]*?src=["'])([^"']+)(["'][^>]*>)/gi,
    (_, prefix, src, suffix) => `${prefix}${resolveCpUrl(src)}${suffix}`
  );

  // 9. Strip <script> tags and inline event handlers
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/<script\b[^>]*\/>/gi, "");
  html = html.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, "");

  return html;
}

async function main() {
  const { commit: cliCommit } = parseArgs();
  const commit = await resolveCommit(cliCommit);

  console.log("Downloading src/navigation.md...");
  const navRes = await fetchWithRetry(
    `https://raw.githubusercontent.com/cp-algorithms/cp-algorithms/${commit}/src/navigation.md`
  );
  const navText = await navRes.text();

  const navPaths = new Set();
  const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(navText)) !== null) {
    let p = match[1]
      .replace(/^\.\//, "")
      .replace(/^\//, "")
      .replace(/\.md$/, "")
      .replace(/\.html$/, "")
      .trim();
    navPaths.add(p);
  }

  // Collect all mapped paths from CP_ALGO_ARTICLES
  const allMappedPaths = [
    ...new Set(Object.values(CP_ALGO_ARTICLES).flat()),
  ];

  const validPaths = [];
  const missingPaths = [];

  for (const p of allMappedPaths) {
    if (navPaths.has(p)) {
      validPaths.push(p);
    } else {
      missingPaths.push(p);
    }
  }

  console.log(
    `Mapped articles: ${allMappedPaths.length} (${validPaths.length} valid in navigation, ${missingPaths.length} missing)`
  );

  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  // Download and write LICENSE
  console.log("Downloading LICENSE...");
  const licenseRes = await fetchWithRetry(
    `https://raw.githubusercontent.com/cp-algorithms/cp-algorithms/${commit}/LICENSE`
  );
  const licenseText = await licenseRes.text();
  fs.writeFileSync(path.join(CONTENT_DIR, "LICENSE"), licenseText, "utf8");

  // Determine importedOn date (keep existing if available for reproducibility)
  const todayStr = new Date().toISOString().slice(0, 10);
  let noticeDate = todayStr;
  const noticePath = path.join(CONTENT_DIR, "NOTICE.md");
  if (fs.existsSync(noticePath)) {
    const existingNotice = fs.readFileSync(noticePath, "utf8");
    const dateMatch = existingNotice.match(/- \*\*Date:\*\*\s*([^\r\n]+)/);
    if (dateMatch) {
      noticeDate = dateMatch[1].trim();
    }
  }

  const noticeContent = `# cp-algorithms Notice

- **Source repository:** https://github.com/cp-algorithms/cp-algorithms
- **Commit:** ${commit}
- **Date:** ${noticeDate}
- **Modifications:** Converted from Markdown to HTML; no other changes.
- **Credit:** Text and code by cp-algorithms contributors.
- **License:** CC BY-SA 4.0 (see LICENSE)
`;
  fs.writeFileSync(noticePath, noticeContent, "utf8");

  const indexList = [];
  let importedCount = 0;

  for (let i = 0; i < validPaths.length; i++) {
    const p = validPaths[i];
    const fileName = `${p.replace(/\//g, "__")}.json`;
    const filePath = path.join(CONTENT_DIR, fileName);

    let existingImportedOn = todayStr;
    if (fs.existsSync(filePath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (existingData.importedOn) {
          existingImportedOn = existingData.importedOn;
        }
      } catch {
        // use today
      }
    }

    process.stdout.write(`[${i + 1}/${validPaths.length}] Importing ${p}... `);
    const artRes = await fetchWithRetry(
      `https://raw.githubusercontent.com/cp-algorithms/cp-algorithms/${commit}/src/${p}.md`
    );
    const artText = await artRes.text();

    const { tags, body } = parseFrontMatter(artText);
    const titleMatch = body.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : p;
    // Remove the first # title heading line
    const bodyWithoutH1 = titleMatch
      ? body.replace(/^#\s+.+$/m, "")
      : body;

    const html = processMathAndMarkdown(bodyWithoutH1, p);
    const articleData = {
      path: p,
      title,
      tags,
      html,
      sourceUrl: cpAlgoUrl(p),
      commit,
      importedOn: existingImportedOn,
    };

    fs.writeFileSync(filePath, JSON.stringify(articleData, null, 2) + "\n", "utf8");
    indexList.push({ path: p, title });
    importedCount++;
    console.log("done");

    // Wait ~300ms between requests
    await sleep(300);
  }

  // Sort index by path
  indexList.sort((a, b) => a.path.localeCompare(b.path));
  fs.writeFileSync(
    path.join(CONTENT_DIR, "index.json"),
    JSON.stringify(indexList, null, 2) + "\n",
    "utf8"
  );

  console.log(`\nImport summary: imported ${importedCount}, missing:`);
  if (missingPaths.length === 0) {
    console.log("  (none)");
  } else {
    for (const m of missingPaths) {
      console.log(`  - ${m}`);
    }
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
