// Test-only: the committed content fixture (packages/shared/test/fixtures/content-mini.json, written by
// `pnpm content:fixture`). Not exported from the barrel; app code never reads it.
import fixture from "../../test/fixtures/content-mini.json";
import type { ContentCourse, ContentDoc, ContentLesson, ContentProblem, ContentSnapshot } from "./types";

/** A fresh copy each call, so tests never share one object. */
export function fixtureSnapshot(): ContentSnapshot {
  return structuredClone(fixture as unknown as ContentSnapshot);
}

export function fixtureEntities() {
  const s = fixtureSnapshot();
  const of = <T>(kind: string) => s.entities.filter((e) => e.kind === kind).map((e) => e.value as T);
  return {
    problems: of<ContentProblem>("problem"),
    lessons: of<ContentLesson>("lesson"),
    courses: of<ContentCourse>("course"),
    docs: of<ContentDoc>("doc"),
  };
}
