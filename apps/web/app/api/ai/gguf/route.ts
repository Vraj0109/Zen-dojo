import { NextResponse } from "next/server";
import { aiError, guardAi, isResponse } from "@/lib/ai/guard";
import { defaultGgufFolders, findGgufFiles, isUsableFolder, suggestModelName } from "@/lib/ai/gguf";
import { getGgufFolders, getGgufImports, MAX_GGUF_FOLDERS, setGgufFolders } from "@/lib/ui-prefs";

// Plan 0082: GGUF model files on this computer. Desktop only (404 on the hosted site).
// Body: {} lists the folders and the files found; { folders: string[] } saves the folder list first.
// Each folder must be an absolute path to an existing folder; at most 10.
export async function POST(req: Request) {
  const s = await guardAi(req, { allowDisabled: true });
  if (isResponse(s)) return s;
  let b: { folders?: unknown };
  try {
    b = (await req.json()) as typeof b;
  } catch {
    b = {};
  }
  try {
    if (b.folders !== undefined) {
      if (!Array.isArray(b.folders) || b.folders.length > MAX_GGUF_FOLDERS || !b.folders.every((f) => typeof f === "string")) return aiError(400, "bad_folders");
      const list = (b.folders as string[]).map((f) => f.trim()).filter(Boolean);
      if (!list.every(isUsableFolder)) return aiError(400, "bad_folder");
      await setGgufFolders(list);
    }
    const folders = (await getGgufFolders()) ?? defaultGgufFolders();
    const [files, imports] = await Promise.all([findGgufFiles(folders), getGgufImports()]);
    const names = files.map((f) => f.name);
    return NextResponse.json(
      {
        ok: true,
        folders,
        files: files.map((f) => ({ ...f, suggested: suggestModelName(f.name, names), imported: imports[f.path] ?? null })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return aiError(500, "internal_error");
  }
}
