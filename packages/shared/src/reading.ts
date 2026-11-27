// Reading list: papers, posts, docs and books attached to the concepts and designs they explain.
// Links can move over time; you can also add your own on any concept or design page.

export type ReadingKind = "paper" | "article" | "docs" | "book" | "course";

export interface Reading {
  id: string;
  title: string;
  url: string;
  kind: ReadingKind;
  /** Author or publisher */
  by: string;
  /** Why it's worth the time, in one line */
  why: string;
  /** Concept / exercise ids it helps with */
  items: string[];
}

export const READING_KINDS: Record<ReadingKind, string> = {
  paper: "Paper",
  article: "Article",
  docs: "Docs",
  book: "Book",
  course: "Course",
};
