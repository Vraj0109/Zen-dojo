// Interview walkthroughs for DSA problems (plan 0090). Files: packages/shared/content/interview/<problem-id>.md
//   pnpm interview:context <id...> | --group d|e|f | --batch N
//   pnpm interview:check [id...]
//   pnpm interview:status [group]
//   pnpm interview:todo --group d|e|f [--limit 25]
//   pnpm interview:build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const INTERVIEW_DIR = path.join(root, "packages/shared/content/interview");
export const GENERATED_FILE = path.join(root, "packages/shared/src/judge/generated/interview.ts");
export const CONTEXT_DIR = path.join(root, "tmp/interview-context");
export const SOLUTIONS_DIR = path.join(root, "packages/shared/content/solutions");

export const REQUIRED_HEADINGS = [
  "Clarify first",
  "Examples to say out loud",
  "Brute force",
  "The key observation",
  "Optimal approach",
  "Code walkthrough",
  "Test it out loud",
  "Common mistakes",
];
export const OPTIONAL_HEADINGS = ["Follow-ups", "Further reading"];
export const ALL_ALLOWED_HEADINGS = [...REQUIRED_HEADINGS, ...OPTIONAL_HEADINGS];

export const FORBIDDEN_PHRASES = [
  "As an AI",
  "In this article",
  "leetcode.com/problems/*/solutions",
  "geeksforgeeks",
];

/**
 * Reads all interview markdown files in the folder.
 * @returns {{ files: { id: string; name: string; content: string }[]; errors: string[] }}
 */
export function readInterviewFiles(dir = INTERVIEW_DIR) {
  const files = [];
  const errors = [];
  if (!fs.existsSync(dir)) return { files, errors };
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === "README.md") continue;
    const full = path.join(dir, name);
    if (!fs.statSync(full).isFile()) {
      errors.push(`${name}: only files are allowed in the interview folder`);
      continue;
    }
    if (!name.endsWith(".md")) {
      errors.push(`${name}: extension must be .md`);
      continue;
    }
    const id = name.slice(0, -3);
    files.push({ id, name, content: fs.readFileSync(full, "utf8").replace(/\r\n?/g, "\n") });
  }
  return { files, errors };
}

/**
 * Parses frontmatter and body from markdown text.
 */
export function parseFrontmatter(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") return { frontmatter: null, body: text, error: "file must start with ---" };
  let i = 1;
  const meta = {};
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const line = lines[i];
    // Strip comments like # ...
    const stripped = line.replace(/#.*$/, "").trim();
    if (!stripped) continue;
    const m = stripped.match(/^([\w-]+):\s*(.*)$/);
    if (!m) return { frontmatter: null, body: text, error: `invalid frontmatter line: "${lines[i]}"` };
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[m[1]] = val;
  }
  if (i >= lines.length) return { frontmatter: null, body: text, error: "frontmatter block is never closed with ---" };
  const body = lines.slice(i + 1).join("\n");
  return { frontmatter: meta, body, error: null };
}

/**
 * Validates a single interview file.
 * Returns an array of error strings (empty if valid).
 */
export function validateInterviewFile(file, knownIds) {
  const errors = [];
  if (!knownIds.has(file.id)) {
    errors.push(`${file.name}: "${file.id}" is not a known problem id`);
  }

  const { frontmatter, body, error: fmError } = parseFrontmatter(file.content);
  if (fmError) {
    errors.push(`${file.name}: ${fmError}`);
    return errors;
  }
  if (!frontmatter) {
    errors.push(`${file.name}: missing frontmatter`);
    return errors;
  }

  // Check required frontmatter fields
  for (const field of ["id", "pattern", "difficulty", "optimal", "reviewed"]) {
    if (frontmatter[field] === undefined || frontmatter[field] === "") {
      errors.push(`${file.name}: frontmatter missing "${field}"`);
    }
  }

  if (frontmatter.id && frontmatter.id !== file.id) {
    errors.push(`${file.name}: frontmatter id "${frontmatter.id}" does not match file id "${file.id}"`);
  }

  if (frontmatter.reviewed !== undefined && frontmatter.reviewed !== "true" && frontmatter.reviewed !== "false") {
    errors.push(`${file.name}: frontmatter "reviewed" must be true or false`);
  }

  // Forbidden phrases check
  for (const phrase of FORBIDDEN_PHRASES) {
    if (phrase === "leetcode.com/problems/*/solutions") {
      if (/leetcode\.com\/problems\/[^/\s]+\/solutions/i.test(file.content)) {
        errors.push(`${file.name}: contains forbidden pattern "leetcode.com/problems/*/solutions"`);
      }
    } else {
      if (file.content.toLowerCase().includes(phrase.toLowerCase())) {
        errors.push(`${file.name}: contains forbidden phrase "${phrase}"`);
      }
    }
  }

  // Check headings in order
  const lines = body.split("\n");
  const headings = [];
  const headingLineIndices = [];
  let inCodeFence = false;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (line.trim().startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (!inCodeFence) {
      const match = line.match(/^##\s+(.+)$/);
      if (match) {
        headings.push(match[1].trim());
        headingLineIndices.push(idx);
      }
    }
  }

  // Check order of headings:
  // Required headings must appear in the exact order:
  // "Clarify first", "Examples to say out loud", "Brute force", "The key observation",
  // "Optimal approach", "Code walkthrough", "Test it out loud", "Common mistakes"
  // Followed optionally by "Follow-ups" then optionally "Further reading"
  // Or "Follow-ups" can appear before "Common mistakes"?
  // Plan section 51 says:
  // Exact headings, in this order:
  // Clarify first
  // Examples to say out loud
  // Brute force
  // The key observation
  // Optimal approach
  // Code walkthrough
  // Test it out loud
  // Follow-ups (optional)
  // Common mistakes (required)
  // Further reading (optional)
  // Wait! In prompt step 1 it says:
  // required headings in order ("Clarify first", "Examples to say out loud", "Brute force", "The key observation", "Optimal approach", "Code walkthrough", "Test it out loud", "Common mistakes"; optional "Follow-ups", optional "Further reading")
  // Let's check plan section:
  // In prompt: 'required headings in order ("Clarify first", "Examples to say out loud", "Brute force", "The key observation", "Optimal approach", "Code walkthrough", "Test it out loud", "Common mistakes"; optional "Follow-ups", optional "Further reading")'
  // In plan sample:
  // ## Test it out loud
  // ## Follow-ups
  // ## Common mistakes
  // ## Further reading
  // Notice in the sample: Follow-ups comes after Test it out loud, then Common mistakes, then Further reading.
  // Let's support both: Follow-ups either before Common mistakes or after Test it out loud.
  // Specifically:
  // The relative order of present headings must be consistent with:
  // Clarify first
  // Examples to say out loud
  // Brute force
  // The key observation
  // Optimal approach
  // Code walkthrough
  // Test it out loud
  // Follow-ups (optional)
  // Common mistakes
  // Further reading (optional)
  // But wait! What if Follow-ups is after Common mistakes in someone's writeup?
  // Let's check: If we accept Follow-ups either between "Test it out loud" and "Common mistakes" OR between "Common mistakes" and "Further reading", that's very tolerant and safe!
  // Let's check all required headings are present:
  for (const req of REQUIRED_HEADINGS) {
    if (!headings.includes(req)) {
      errors.push(`${file.name}: missing required heading "## ${req}"`);
    }
  }

  // Check no unknown ## headings
  for (const h of headings) {
    if (!ALL_ALLOWED_HEADINGS.includes(h)) {
      errors.push(`${file.name}: unknown heading "## ${h}"`);
    }
  }

  // Check required headings appear in order relative to each other:
  let lastIdx = -1;
  for (const req of REQUIRED_HEADINGS) {
    const curIdx = headings.indexOf(req);
    if (curIdx !== -1) {
      if (curIdx < lastIdx) {
        errors.push(`${file.name}: heading "## ${req}" is out of order`);
      }
      lastIdx = curIdx;
    }
  }

  // Links only under Further reading:
  // Check if any http:// or https:// or markdown link [text](url) appears outside the "Further reading" section.
  const furtherReadingIdx = headings.indexOf("Further reading");
  const furtherReadingLine = furtherReadingIdx !== -1 ? headingLineIndices[furtherReadingIdx] : lines.length;

  for (let l = 0; l < furtherReadingLine; l++) {
    const line = lines[l];
    // check for http:// or https:// or [foo](bar)
    if (/https?:\/\//i.test(line) || /\[.+?\]\(.+?\)/.test(line)) {
      errors.push(`${file.name}: line ${l + 1}: links are only allowed under "## Further reading"`);
    }
  }

  // Word count bounds: 350-1100 words (total document or body words)
  // Counting all words in file.content or body? Usually word count bounds (350-1100 words) applies to the document text.
  // Standard word split: split by whitespace.
  const words = file.content.trim().split(/\s+/).filter(Boolean);
  if (words.length < 350 || words.length > 1100) {
    errors.push(`${file.name}: word count (${words.length}) out of bounds (350-1100 words)`);
  }

  return errors;
}

/** The generated TypeScript for the given interview files. */
export function renderGenerated(files) {
  const by = {};
  for (const f of files) {
    const { frontmatter, body } = parseFrontmatter(f.content);
    if (frontmatter) {
      by[f.id] = {
        md: f.content,
        optimal: frontmatter.optimal ?? "",
        reviewed: frontmatter.reviewed === "true",
      };
    }
  }
  const ids = Object.keys(by).sort();
  const head = `// Generated by scripts/interview.mjs from packages/shared/content/interview/. Do not edit; run \`pnpm interview:build\`.
export const INTERVIEW: Record<string, { md: string; optimal: string; reviewed: boolean }> = `;
  if (!ids.length) return `${head}{};\n`;
  const rows = ids.map((id) => {
    const item = by[id];
    return `  ${JSON.stringify(id)}: {\n    optimal: ${JSON.stringify(item.optimal)},\n    reviewed: ${item.reviewed},\n    md: ${JSON.stringify(item.md)},\n  },`;
  });
  return `${head}{\n${rows.join("\n")}\n};\n`;
}

/**
 * Status of groups for interview files.
 */
export function interviewGroupStatus(ids, files) {
  const fileMap = new Map(files.map((f) => [f.id, f]));
  let written = 0;
  let reviewed = 0;
  const missing = [];

  for (const id of ids) {
    const f = fileMap.get(id);
    if (f) {
      written++;
      const { frontmatter } = parseFrontmatter(f.content);
      if (frontmatter?.reviewed === "true") reviewed++;
    } else {
      missing.push(id);
    }
  }

  return {
    total: ids.length,
    written,
    reviewed,
    missing,
  };
}

async function loadTs() {
  const shared = await import("@habit/shared");
  const groups = await import("../packages/shared/src/judge/solution-groups.ts");
  return {
    JUDGE_PROBLEMS: shared.JUDGE_PROBLEMS,
    ALL_PATTERNS: shared.ALL_PATTERNS,
    PROBLEMS: shared.PROBLEMS,
    ...groups,
  };
}

/**
 * Generate context markdown for one problem id.
 */
export function generateContext(id, spec, dsaMeta, patternMeta, solutions = {}) {
  const parts = [];
  parts.push(`# ${spec.title} (${spec.id})`);

  // LeetCode slug / number
  const num = dsaMeta?.number ?? (spec.id.startsWith("lc-") ? parseInt(spec.id.slice(3), 10) : undefined);
  const slug = dsaMeta?.slug ?? (dsaMeta?.url?.match(/leetcode\.com\/problems\/([^/]+)/)?.[1]);
  if (num || slug) {
    parts.push(`LeetCode: ${num ? `#${num}` : ""} ${slug ? `(${slug})` : ""}`.trim());
  }

  // Difficulty
  const difficulty = spec.difficulty ?? dsaMeta?.difficulty ?? "medium";
  parts.push(`Difficulty: ${difficulty}`);

  // Pattern name & recognize text
  if (patternMeta) {
    parts.push(`Pattern: ${patternMeta.name}\nRecognize: ${patternMeta.recognize}`);
  } else if (spec.pattern) {
    parts.push(`Pattern: ${spec.pattern}`);
  }

  // Statement
  parts.push(`## Statement\n${spec.statement.join("\n\n")}`);

  // Constraints
  if (spec.constraints?.length) {
    parts.push(`## Constraints\n${spec.constraints.map((c) => `- ${c}`).join("\n")}`);
  }

  // Examples
  if (spec.examples?.length) {
    const exList = spec.examples.map((ex, i) => {
      let s = `Example ${i + 1}:\nInput: ${JSON.stringify(ex.input)}\nOutput: ${JSON.stringify(ex.output)}`;
      if (ex.explanation) s += `\nExplanation: ${ex.explanation}`;
      return s;
    });
    parts.push(`## Examples\n${exList.join("\n\n")}`);
  }

  // First 5 tests
  if (spec.tests?.length) {
    const first5 = spec.tests.slice(0, 5).map((t, i) => `Test ${i + 1}: Input: ${JSON.stringify(t.input)} -> Output: ${JSON.stringify(t.output)}`);
    parts.push(`## Tests (first 5)\n${first5.join("\n")}`);
  }

  // Hints
  if (spec.hints?.length) {
    parts.push(`## Hints\n${spec.hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}`);
  }

  // Solution idea & complexity
  if (spec.solution) {
    parts.push(`## Solution Idea\n${spec.solution.idea?.join("\n\n") ?? ""}`);
    parts.push(`## Solution Complexity\n${spec.solution.complexity ?? ""}`);
    if (spec.solution.cpp) {
      parts.push(`## Reference C++ Code\n\`\`\`cpp\n${spec.solution.cpp}\n\`\`\``);
    }
  }

  // Java & Python solutions if present
  if (solutions.java) {
    parts.push(`## Reference Java Code\n\`\`\`java\n${solutions.java}\n\`\`\``);
  }
  if (solutions.python) {
    parts.push(`## Reference Python Code\n\`\`\`python\n${solutions.python}\n\`\`\``);
  }

  return parts.join("\n\n") + "\n";
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "build" || cmd === "check") {
    const { files, errors } = readInterviewFiles();
    const { JUDGE_PROBLEMS } = await loadTs();
    const knownIds = new Set(Object.keys(JUDGE_PROBLEMS));

    const bad = [...errors];
    for (const f of files) {
      bad.push(...validateInterviewFile(f, knownIds));
    }

    if (cmd === "build") {
      if (bad.length) {
        console.error(`Interview file errors (${bad.length}):\n${bad.map((b) => `  ${b}`).join("\n")}`);
        process.exit(1);
      }
      const out = renderGenerated(files);
      const have = fs.existsSync(GENERATED_FILE) ? fs.readFileSync(GENERATED_FILE, "utf8").replace(/\r\n/g, "\n") : "";
      if (have !== out) fs.writeFileSync(GENERATED_FILE, out);
      console.log(`Built ${files.length} interview files into packages/shared/src/judge/generated/interview.ts`);
      return;
    }

    if (bad.length) {
      console.error(`Interview file errors (${bad.length}):\n${bad.map((b) => `  ${b}`).join("\n")}`);
      process.exit(1);
    }
    console.log(`Interview check OK: ${files.length} files.`);
    return;
  }

  if (cmd === "context") {
    const { JUDGE_PROBLEMS, ALL_PATTERNS, PROBLEMS, SOLUTION_GROUP_IDS, groupIds } = await loadTs();
    let targetIds = [];

    const groupIdx = rest.indexOf("--group");
    const batchIdx = rest.indexOf("--batch");

    if (groupIdx !== -1) {
      const g = rest[groupIdx + 1];
      if (!SOLUTION_GROUP_IDS.includes(g)) {
        console.error(`Unknown group "${g}". Use one of: ${SOLUTION_GROUP_IDS.join(", ")}`);
        process.exit(2);
      }
      targetIds = groupIds(g);
    } else if (batchIdx !== -1) {
      const batchNum = parseInt(rest[batchIdx + 1], 10);
      const batchSize = 25;
      const allIds = Object.keys(JUDGE_PROBLEMS);
      targetIds = allIds.slice(batchNum * batchSize, (batchNum + 1) * batchSize);
    } else {
      const explicitIds = rest.filter((a) => !a.startsWith("-"));
      if (explicitIds.length > 0) {
        targetIds = explicitIds;
      } else {
        console.error("Usage: pnpm interview:context <id...> | --group d|e|f | --batch N");
        process.exit(2);
      }
    }

    fs.mkdirSync(CONTEXT_DIR, { recursive: true });

    let writtenCount = 0;
    for (const id of targetIds) {
      const spec = JUDGE_PROBLEMS[id];
      if (!spec) {
        console.warn(`Warning: Unknown problem id "${id}"`);
        continue;
      }
      const dsaMeta = PROBLEMS[id];
      const patternMeta = ALL_PATTERNS.find((p) => p.problems.includes(id));

      const solutions = {};
      const javaPath = path.join(SOLUTIONS_DIR, `${id}.java`);
      if (fs.existsSync(javaPath)) solutions.java = fs.readFileSync(javaPath, "utf8");
      const pyPath = path.join(SOLUTIONS_DIR, `${id}.py`);
      if (fs.existsSync(pyPath)) solutions.python = fs.readFileSync(pyPath, "utf8");

      const md = generateContext(id, spec, dsaMeta, patternMeta, solutions);
      fs.writeFileSync(path.join(CONTEXT_DIR, `${id}.md`), md);
      writtenCount++;
    }

    console.log(`Wrote context files for ${writtenCount} problems to tmp/interview-context/`);
    return;
  }

  if (cmd === "status") {
    const { SOLUTION_GROUP_IDS, groupIds } = await loadTs();
    const groupArg = rest.find((a) => !a.startsWith("-"));
    if (groupArg && !SOLUTION_GROUP_IDS.includes(groupArg)) {
      console.error(`Unknown group "${groupArg}". Use one of: ${SOLUTION_GROUP_IDS.join(", ")}`);
      process.exit(2);
    }

    const { files } = readInterviewFiles();
    const groups = groupArg ? [groupArg] : SOLUTION_GROUP_IDS;

    for (const g of groups) {
      const ids = groupIds(g);
      const s = interviewGroupStatus(ids, files);
      const pct = (n) => `${n}/${s.total} (${Math.round((n / (s.total || 1)) * 100)}%)`;
      console.log(`group ${g}: written ${pct(s.written)}, reviewed ${pct(s.reviewed)}, missing ${s.missing.length}`);
    }
    return;
  }

  if (cmd === "todo") {
    const { JUDGE_PROBLEMS, SOLUTION_GROUP_IDS, groupIds } = await loadTs();
    const groupIdx = rest.indexOf("--group");
    const group = groupIdx !== -1 ? rest[groupIdx + 1] : rest.find((a) => !a.startsWith("-"));
    if (!group || !SOLUTION_GROUP_IDS.includes(group)) {
      console.error(`Usage: pnpm interview:todo --group d|e|f [--limit 25]`);
      process.exit(2);
    }

    const limitIdx = rest.indexOf("--limit");
    const limit = limitIdx !== -1 ? parseInt(rest[limitIdx + 1], 10) : 25;

    const { files } = readInterviewFiles();
    const ids = groupIds(group);
    const s = interviewGroupStatus(ids, files);

    // Order: LeetCode problems in roadmap order, then the rest
    const lcOrder = s.missing.filter((id) => id.startsWith("lc-"));
    const restOrder = s.missing.filter((id) => !id.startsWith("lc-"));
    const ordered = [...lcOrder, ...restOrder].slice(0, limit);

    if (!ordered.length) {
      console.log(`Group ${group} has no missing interview writeups.`);
      return;
    }

    console.log(`Group ${group}: ${s.missing.length} missing writeups. Next ${ordered.length}:`);
    for (const id of ordered) {
      const spec = JUDGE_PROBLEMS[id];
      console.log(`- ${id}: ${spec?.title ?? id}`);
    }
    return;
  }

  console.error("Usage: node scripts/interview.mjs context | check | status | todo | build");
  process.exit(2);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
