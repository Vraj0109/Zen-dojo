export interface SolutionFile {
  id: string;
  lang: "cpp" | "java" | "python";
  name: string;
  code: string;
}
export const SOLUTIONS_DIR: string;
export const GENERATED_FILE: string;
export const SKIP_STRESS_LINE: string;
export function readSolutionFiles(dir?: string): { files: SolutionFile[]; bruteFiles: SolutionFile[]; errors: string[] };
export function renderGenerated(files: SolutionFile[], bruteFiles?: SolutionFile[]): string;
export function checkFiles(files: SolutionFile[], folderErrors: string[], knownIds: Set<string>): string[];
export function generatedIsCurrent(dir?: string, generated?: string): boolean;
export function groupStatus(
  ids: string[],
  files: SolutionFile[],
  bruteFiles?: SolutionFile[],
  interviewBy?: Record<string, { brute?: string }>,
): {
  total: number;
  java: number;
  python: number;
  missing: string[];
  missingJava: string[];
  missingPython: string[];
  skipStress: string[];
  bruteSame: number;
  bruteCpp: number;
  bruteJava: number;
  brutePython: number;
  missingBrute: string[];
  missingBruteCpp: string[];
  missingBruteJava: string[];
  missingBrutePython: string[];
};
