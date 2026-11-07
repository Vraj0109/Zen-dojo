import type { CSSProperties } from "react";
import { guessLang, toLang, type Lang } from "@/lib/code-lang";
import { highlight } from "@/lib/highlight";
import { CopyButton } from "./copy-button";

/**
 * Syntax-coloured, read-only code. `lang` is a language name from LeetCode or the language picker ("C++", "Python3");
 * without it the language is guessed from the code. `maxHeight` is a CSS length such as "20rem".
 */
export async function Code({ code, lang, label, maxHeight = "36rem" }: { code: string; lang?: string | Lang | null; label?: string; maxHeight?: string }) {
  const resolved = lang ? toLang(lang) : guessLang(code);
  // Unknown names fall back to a guess, so "Other" still gets colours when the code is recognisable.
  const html = await highlight(code, resolved === "text" ? guessLang(code) : resolved);
  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-muted">{label}</p>}
      <div className="group/code relative" style={{ "--code-max": maxHeight } as CSSProperties}>
        {/* Shiki escapes the code; nothing else goes into this HTML. */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <CopyButton text={code} />
      </div>
    </div>
  );
}
