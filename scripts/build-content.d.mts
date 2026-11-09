export interface ParsedLesson {
  id: string;
  title: string;
  area: string;
  section: string;
  points: string[];
  lesson: { overview: string; explain: string[]; questions: string[]; pitfalls?: string[] };
  recap: string[];
  deeper: { title: string; body: string; code?: string; lang?: string; diagram?: string; diagramCaption?: string; point?: number }[];
}
export class ContentError extends Error {
  file: string;
  line: number;
}
export const CONTENT_DIR: string;
export const GENERATED_FILE: string;
export function parseLesson(src: string, file?: string): ParsedLesson;
export function readAll(dir?: string): { lessons: Record<string, ParsedLesson>; errors: string[] };
export function renderGenerated(lessons: Record<string, ParsedLesson>): string;
export function lessonToMarkdown(l: { id: string; title: string; area: string; section: string; points: string[]; lesson: ParsedLesson["lesson"]; recap?: string[]; deeper: ParsedLesson["deeper"] }): string;
export function generatedIsCurrent(): boolean;
export function writeLessonFiles(files: { area: string; id: string; md: string }[], dir?: string): number;
