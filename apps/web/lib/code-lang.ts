// Language names for code: LeetCode names, the notes language list, and the ids the highlighter and editor use.
// Pure (no server-only), so client components can import it.

export const LANGS = ["cpp", "java", "python", "javascript", "typescript", "sql", "go", "rust", "csharp", "kotlin", "swift", "json", "bash", "text"] as const;
export type Lang = (typeof LANGS)[number];

const BY_NAME: Record<string, Lang> = {
  "c++": "cpp",
  cpp: "cpp",
  c: "cpp",
  java: "java",
  python: "python",
  python3: "python",
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  sql: "sql",
  mysql: "sql",
  postgresql: "sql",
  postgres: "sql",
  mssql: "sql",
  oraclesql: "sql",
  go: "go",
  golang: "go",
  rust: "rust",
  "c#": "csharp",
  csharp: "csharp",
  kotlin: "kotlin",
  swift: "swift",
  json: "json",
  bash: "bash",
  shell: "bash",
  sh: "bash",
};

/** Maps a language name from LeetCode or the language picker to a supported id; unknown names are `text`. */
export function toLang(name?: string | null): Lang {
  return BY_NAME[(name ?? "").trim().toLowerCase()] ?? "text";
}

/** Cheap guess for code that has no language attached. */
export function guessLang(code: string): Lang {
  if (/#include\s*[<"]|std::|\bvector<|\bunordered_map<|\bcout\s*<</.test(code)) return "cpp";
  if (/\bpublic\s+(static\s+)?(class|interface|void)\b|\bimport\s+java\.|\bSystem\.out\./.test(code)) return "java";
  if (/^\s*(SELECT|INSERT\s+INTO|UPDATE|CREATE\s+TABLE|ALTER\s+TABLE|WITH)\b/im.test(code)) return "sql";
  if (/^\s*def\s+\w+\(.*\)\s*:/m.test(code) || /^\s*(from\s+\w+\s+import|import\s+\w+\s*$)/m.test(code)) return "python";
  if (/\bfunc\s+\w+\(|\bpackage\s+main\b/.test(code)) return "go";
  if (/\bfn\s+\w+\(|\blet\s+mut\b/.test(code)) return "rust";
  if (/\binterface\s+\w+\s*\{|:\s*(string|number|boolean)\b/.test(code)) return "typescript";
  if (/\bfunction\s+\w+\(|=>|\bconst\s+\w+\s*=|\bconsole\.log\b/.test(code)) return "javascript";
  if (/^\s*[{[]/.test(code) && /"\s*:/.test(code)) return "json";
  return "text";
}
