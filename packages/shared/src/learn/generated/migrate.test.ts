import { describe, it } from "vitest";
import { lessonToMarkdown, writeLessonFiles } from "../../../../../scripts/build-content.mjs";
import { ALL_CONCEPTS } from "../../study";
import { TS_EXTRA, TS_LESSONS } from "../index";
import { SECTION_POINTS } from "../section-points";

// Migration helper, not a real test: it does nothing unless MIGRATE is set. It writes the Markdown file for every
// TypeScript lesson that matches, then you run `pnpm content:build`.
//   MIGRATE=lld         all lessons of an area (sd, lld, core)
//   MIGRATE=lld-solid   one concept id (comma separated list allowed)
// Existing .md files are overwritten, so run it only before editing the Markdown by hand, or on ids you have not touched.
// Used for step 4 of plan 0023; kept until the LLD migration is redone on top of the merged work.

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const want = (env.MIGRATE ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);

describe.skipIf(want.length === 0)("migrate lessons to Markdown", () => {
  it("writes the files", () => {
    const files: { area: string; id: string; md: string }[] = [];
    for (const [id, concept] of Object.entries(ALL_CONCEPTS)) {
      if (!want.includes(id) && !want.includes(concept.area)) continue;
      if (!TS_LESSONS[id]) continue; // already Markdown
      const extra = TS_EXTRA[id];
      const deeper = (extra?.deeper ?? []).map((s) => ({ ...s, point: SECTION_POINTS[id]?.[s.title] }));
      const md: string = lessonToMarkdown({ id, title: concept.title, area: concept.area, section: concept.section, points: concept.points, lesson: TS_LESSONS[id], recap: extra?.recap, deeper });
      files.push({ area: concept.area, id, md });
    }
    console.log(`Wrote ${writeLessonFiles(files)} lesson files`);
  });
});
