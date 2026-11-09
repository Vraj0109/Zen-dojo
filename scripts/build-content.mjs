// Reads packages/shared/content/<area>/<concept-id>.md and writes packages/shared/src/learn/generated/lessons.ts.
//   node scripts/build-content.mjs          build (writes the generated file)
//   node scripts/build-content.mjs --check  validate and fail if the generated file is out of date
// Format and how to edit: docs/content-editing.md (plan 0023). Plain Node, no dependencies.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CONTENT_DIR = path.join(root, "packages/shared/content");
export const GENERATED_FILE = path.join(root, "packages/shared/src/learn/generated/lessons.ts");
const AREAS = ["sd", "lld", "core"];
const FENCE = "`".repeat(3);

export class ContentError extends Error {
  constructor(file, line, what, fix) {
    super(`${file}${line ? `:${line}` : ""}: ${what}${fix ? `\n    How to fix: ${fix}` : ""}`);
    this.file = file;
    this.line = line;
  }
}

/**
 * Parses one lesson file.
 * @param {string} src file text
 * @param {string} file name used in error messages
 */
export function parseLesson(src, file = "lesson.md") {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const fail = (line, what, fix) => {
    throw new ContentError(file, line, what, fix);
  };
  const isFence = (t) => t.startsWith(FENCE);

  // Front matter
  if (lines[0]?.trim() !== "---") fail(1, "the file must start with a front matter block (a line with ---)", "add ---, then id/title/area/section lines, then --- at the top");
  const meta = {};
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const m = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!m) fail(i + 1, `front matter line "${lines[i]}" is not "key: value"`, "write it as key: value");
    meta[m[1]] = m[2].trim();
  }
  if (i >= lines.length) fail(1, "the front matter block is never closed", "add a line with --- after the key: value lines");
  for (const k of ["id", "title", "area", "section"]) if (!meta[k]) fail(1, `front matter is missing "${k}"`, `add a line "${k}: ..."`);
  if (!AREAS.includes(meta.area)) fail(1, `area "${meta.area}" is not one of ${AREAS.join(", ")}`, "use the study area id from study.ts");
  const bodyStart = i + 1;

  // Split into ## sections, ignoring headings inside code fences.
  const H2 = ["Overview", "What to know", "Recap", "Go deeper", "Interview questions", "Common mistakes"];
  const blocks = [];
  let fence = false;
  let cur = null;
  for (let n = bodyStart; n < lines.length; n++) {
    const text = lines[n];
    if (isFence(text)) fence = !fence;
    const h = !fence && !text.startsWith("###") && text.match(/^##\s+(.*?)\s*$/);
    if (h) {
      if (!H2.includes(h[1])) fail(n + 1, `unknown section "## ${h[1]}"`, `use one of: ${H2.map((x) => `## ${x}`).join(", ")}`);
      if (blocks.some((b) => b.name === h[1])) fail(n + 1, `section "## ${h[1]}" appears twice`, "keep one");
      cur = { name: h[1], line: n + 1, lines: [] };
      blocks.push(cur);
    } else if (cur) cur.lines.push({ text, no: n + 1 });
    else if (text.trim() !== "") fail(n + 1, "text before the first ## heading", "start with ## Overview");
  }
  if (fence) fail(lines.length, `a code fence (${FENCE}) is never closed`, `add the closing ${FENCE}`);
  const get = (name) => blocks.find((b) => b.name === name);
  const trimBlank = (arr) => {
    let a = 0;
    let b = arr.length;
    while (a < b && arr[a].text.trim() === "") a++;
    while (b > a && arr[b - 1].text.trim() === "") b--;
    return arr.slice(a, b);
  };
  const textOf = (arr) => trimBlank(arr).map((l) => l.text).join("\n");

  const ov = get("Overview");
  if (!ov || textOf(ov.lines) === "") fail(ov?.line ?? bodyStart, "## Overview is missing or empty", "write 2-4 sentences under ## Overview");
  const wk = get("What to know");
  if (!wk) fail(bodyStart, "## What to know is missing", "add it with a numbered list: 1. Point :: explanation");

  // What to know: "N. point :: explanation"; the explanation may continue over lines and paragraphs.
  const points = [];
  const explain = [];
  let item = null;
  for (const l of wk.lines) {
    const m = l.text.match(/^(\d+)\.\s+(.*)$/);
    if (m) {
      if (Number(m[1]) !== points.length + 1) fail(l.no, `item is numbered ${m[1]} but should be ${points.length + 1}`, "number the points 1, 2, 3 ... in order");
      const parts = m[2].split(" :: ");
      if (parts.length < 2) fail(l.no, `item "${m[2].slice(0, 50)}" has no " :: " between the point and its explanation`, "write: 1. Point text :: explanation");
      points.push(parts[0].trim());
      item = { lines: [parts.slice(1).join(" :: ")], no: l.no };
      explain.push(item);
    } else if (item) item.lines.push(l.text);
    else if (l.text.trim() !== "") fail(l.no, "text before the first numbered point", "start the list with 1.");
  }
  if (points.length === 0) fail(wk.line, "## What to know has no numbered points", "add 1. Point :: explanation");
  const explainText = explain.map((e, k) => {
    const t = e.lines.join("\n").trim();
    if (t === "") fail(e.no, `point ${k + 1} has an empty explanation`, "write the explanation after ' :: '");
    return t;
  });

  const bullets = (name) => {
    const b = get(name);
    if (!b) return undefined;
    const out = [];
    for (const l of b.lines) {
      const m = l.text.match(/^[-*]\s+(.*)$/);
      if (m) out.push(m[1]);
      else if (l.text.trim() === "") continue;
      else if (out.length > 0 && /^\s+/.test(l.text)) out[out.length - 1] += " " + l.text.trim();
      else fail(l.no, `"${l.text.slice(0, 40)}" is not a list item under ## ${name}`, "write each item as: - text");
    }
    if (out.length === 0) fail(b.line, `## ${name} has no list items`, "add - items or remove the heading");
    return out;
  };

  // Go deeper
  const deeper = [];
  const gd = get("Go deeper");
  if (gd) {
    let sec = null;
    let infence = false;
    const flush = () => {
      if (!sec) return;
      const body = [];
      let blockSeen = false;
      let code;
      let lang;
      let diagram;
      let caption;
      const L = trimBlank(sec.lines);
      for (let k = 0; k < L.length; k++) {
        const { text, no } = L[k];
        const f = text.match(/^```(\S*)\s*$/);
        if (f) {
          const buf = [];
          k++;
          while (k < L.length && !/^```\s*$/.test(L[k].text)) buf.push(L[k++].text);
          blockSeen = true;
          if (f[1] === "mermaid") {
            if (diagram !== undefined) fail(no, `section "${sec.title}" has two mermaid diagrams`, "a section holds one diagram; split it into two ### sections");
            diagram = buf.join("\n");
            const c = L[k + 1]?.text.match(/^Diagram caption:\s*(.*)$/);
            if (c) {
              caption = c[1].trim();
              k++;
            }
          } else {
            if (code !== undefined) fail(no, `section "${sec.title}" has two code blocks`, "a section holds one code block; split it into two ### sections");
            code = buf.join("\n");
            lang = f[1] || undefined;
          }
        } else if (blockSeen) {
          if (text.trim() !== "") fail(no, `text after a code or diagram block in section "${sec.title}"`, "put all prose first, then the mermaid block, then the code block");
        } else body.push(text);
      }
      const bodyText = body.join("\n").trim();
      if (bodyText === "") fail(sec.line, `section "${sec.title}" has no text`, "write the explanation under the ### heading");
      const s = { title: sec.title, body: bodyText };
      if (code !== undefined) s.code = code;
      if (lang) s.lang = lang;
      if (diagram !== undefined) s.diagram = diagram;
      if (caption) s.diagramCaption = caption;
      if (sec.point !== undefined) s.point = sec.point;
      deeper.push(s);
    };
    for (const l of gd.lines) {
      if (isFence(l.text)) infence = !infence;
      const h = !infence && l.text.match(/^###\s+(.*?)\s*$/);
      if (h) {
        flush();
        let title = h[1];
        let point;
        const pm = title.match(/\s*\{point:\s*([0-9]+(?:\.[0-9]+)?)\s*\}\s*$/);
        if (pm) {
          point = Number(pm[1]);
          title = title.slice(0, pm.index).trim();
          if (point >= points.length) fail(l.no, `{point: ${point}} but the lesson has only ${points.length} points (0 to ${points.length - 1})`, "use a number from 0 up, or a fraction to go after the last point");
        }
        if (deeper.some((d) => d.title === title) || sec?.title === title) fail(l.no, `two sections are titled "${title}"`, "give each ### section its own title");
        sec = { title, point, line: l.no, lines: [] };
      } else if (sec) sec.lines.push(l);
      else if (l.text.trim() !== "") fail(l.no, "text under ## Go deeper before the first ### heading", "start each part with ### Title");
    }
    flush();
    if (deeper.length === 0) fail(gd.line, "## Go deeper has no ### sections", "add ### Title sections or remove the heading");
    // Sections sort by point (stable); those without a point come last.
    const rank = (s) => s.point ?? Number.POSITIVE_INFINITY;
    const sorted = deeper.map((s, k) => [s, k]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map((x) => x[0]);
    deeper.splice(0, deeper.length, ...sorted);
  }

  const lesson = { overview: textOf(ov.lines), explain: explainText, questions: bullets("Interview questions") ?? [] };
  const pit = bullets("Common mistakes");
  if (pit) lesson.pitfalls = pit;
  return { id: meta.id, title: meta.title, area: meta.area, section: meta.section, points, lesson, recap: bullets("Recap") ?? [], deeper };
}

/**
 * The inverse of parseLesson: writes a lesson as Markdown. Used once to migrate the TypeScript lessons (see
 * learn/generated/migrate.test.ts) and by the round-trip test. Throws when the text could not be read back faithfully.
 * @param {{id:string,title:string,area:string,section:string,points:string[],lesson:{overview:string,explain:string[],questions:string[],pitfalls?:string[]},recap?:string[],deeper:{title:string,body:string,code?:string,lang?:string,diagram?:string,diagramCaption?:string,point?:number}[]}} l
 */
export function lessonToMarkdown(l) {
  const bad = (what) => {
    throw new Error(`${l.id}: ${what}`);
  };
  const plain = (t, where) => {
    for (const line of t.split("\n")) {
      if (isFenceLine(line)) bad(`${where} has a line starting with three backticks`);
      if (/^#{2,3}\s/.test(line)) bad(`${where} has a line that looks like a heading: ${line.slice(0, 40)}`);
    }
  };
  const out = ["---", `id: ${l.id}`, `title: ${l.title}`, `area: ${l.area}`, `section: ${l.section}`, "---", "", "## Overview", "", l.lesson.overview.trim(), "", "## What to know", ""];
  plain(l.lesson.overview, "overview");
  l.points.forEach((p, i) => {
    const ex = (l.lesson.explain[i] ?? "").trim();
    if (!ex) bad(`point ${i + 1} has no explanation`);
    if (p.includes(" :: ")) bad(`point ${i + 1} contains " :: "`);
    plain(ex, `explanation ${i + 1}`);
    if (ex.split("\n").some((x) => /^\d+\.\s/.test(x))) bad(`explanation ${i + 1} has a line starting with a number and a dot`);
    out.push(`${i + 1}. ${p} :: ${ex}`, "");
  });
  if (l.recap?.length) out.push("## Recap", "", ...l.recap.map((r) => item(r, bad)), "");
  if (l.deeper.length) {
    out.push("## Go deeper", "");
    for (const s of l.deeper) {
      plain(s.body, `section "${s.title}"`);
      if (s.body.trim() === "") bad(`section "${s.title}" has no text`);
      out.push(`### ${s.title}${s.point !== undefined ? ` {point: ${s.point}}` : ""}`, "", s.body.trim(), "");
      if (s.diagram !== undefined) {
        if (s.diagram.split("\n").some(isFenceLine)) bad(`diagram in "${s.title}" contains a fence`);
        out.push(FENCE + "mermaid", s.diagram, FENCE);
        if (s.diagramCaption) out.push(`Diagram caption: ${s.diagramCaption}`);
        out.push("");
      }
      if (s.code !== undefined) {
        if (s.code.split("\n").some(isFenceLine)) bad(`code in "${s.title}" contains a fence`);
        out.push(FENCE + (s.lang ?? ""), s.code, FENCE, "");
      }
    }
  }
  if (l.lesson.questions.length) out.push("## Interview questions", "", ...l.lesson.questions.map((r) => item(r, bad)), "");
  if (l.lesson.pitfalls?.length) out.push("## Common mistakes", "", ...l.lesson.pitfalls.map((r) => item(r, bad)), "");
  return out.join("\n").replace(/\n+$/, "\n");
}

const isFenceLine = (t) => t.startsWith(FENCE);
function item(text, bad) {
  if (text.includes("\n")) bad("a list item contains a line break");
  return `- ${text}`;
}

/** Reads every lesson file. Returns { lessons, errors }. */
export function readAll(dir = CONTENT_DIR) {
  const lessons = {};
  const errors = [];
  if (!fs.existsSync(dir)) return { lessons, errors };
  for (const area of fs.readdirSync(dir).sort()) {
    const ad = path.join(dir, area);
    if (!fs.statSync(ad).isDirectory()) continue;
    for (const f of fs.readdirSync(ad).sort()) {
      if (!f.endsWith(".md")) continue;
      const rel = `packages/shared/content/${area}/${f}`;
      try {
        const l = parseLesson(fs.readFileSync(path.join(ad, f), "utf8"), rel);
        if (l.area !== area) throw new ContentError(rel, 1, `front matter area "${l.area}" does not match the folder "${area}"`, "move the file or fix the area");
        if (`${l.id}.md` !== f) throw new ContentError(rel, 1, `id "${l.id}" does not match the file name`, `name the file ${l.id}.md`);
        if (lessons[l.id]) throw new ContentError(rel, 1, `id "${l.id}" is already used by another file`, "ids must be unique");
        lessons[l.id] = l;
      } catch (e) {
        if (e instanceof ContentError) errors.push(e.message);
        else throw e;
      }
    }
  }
  return { lessons, errors };
}

/** The text of the generated TypeScript file. */
export function renderGenerated(lessons) {
  const sorted = Object.fromEntries(Object.keys(lessons).sort().map((k) => [k, lessons[k]]));
  return `// GENERATED by scripts/build-content.mjs from packages/shared/content/. Do not edit by hand: change the .md file,
// then run \`pnpm content:build\`. See docs/content-editing.md.
import type { Lesson, Section } from "../types";

export interface GeneratedLesson {
  id: string;
  title: string;
  area: string;
  section: string;
  /** Checklist points exactly as written in the file (checked against study.ts by a test). */
  points: string[];
  lesson: Lesson;
  recap: string[];
  /** Already in display order. */
  deeper: (Section & { point?: number })[];
}

export const GENERATED_LESSONS: Record<string, GeneratedLesson> = ${JSON.stringify(sorted, null, 2)};
`;
}

/** True when generated/lessons.ts matches the .md files. */
export function generatedIsCurrent() {
  const { lessons, errors } = readAll();
  if (errors.length) return false;
  return fs.existsSync(GENERATED_FILE) && fs.readFileSync(GENERATED_FILE, "utf8") === renderGenerated(lessons);
}

/** Writes lesson Markdown files (used by the migration helper). files: [{ area, id, md }]. Returns the count. */
export function writeLessonFiles(files, dir = CONTENT_DIR) {
  for (const f of files) {
    fs.mkdirSync(path.join(dir, f.area), { recursive: true });
    fs.writeFileSync(path.join(dir, f.area, `${f.id}.md`), f.md);
  }
  return files.length;
}

function main() {
  const check = process.argv.includes("--check");
  const { lessons, errors } = readAll();
  if (errors.length) {
    console.error(`Content problems (${errors.length}):\n\n${errors.join("\n\n")}\n`);
    process.exit(1);
  }
  const out = renderGenerated(lessons);
  const have = fs.existsSync(GENERATED_FILE) ? fs.readFileSync(GENERATED_FILE, "utf8") : "";
  if (check) {
    if (have !== out) {
      console.error("generated/lessons.ts is out of date. Run: pnpm content:build");
      process.exit(1);
    }
    console.log(`Content OK: ${Object.keys(lessons).length} lessons.`);
    return;
  }
  fs.mkdirSync(path.dirname(GENERATED_FILE), { recursive: true });
  if (have !== out) fs.writeFileSync(GENERATED_FILE, out);
  console.log(`Built ${Object.keys(lessons).length} lessons into packages/shared/src/learn/generated/lessons.ts`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
