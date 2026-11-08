// "Focus reading": the first letters of each word are bold, so the eye has an anchor in every word. Pure helpers; the
// DOM work is in app/focus-reading.tsx.
//
// Two strengths. Subtle (the default when switched on) leaves words of up to three letters alone and bolds under a third
// of longer words, with a semi-bold weight, so the page still reads as plain text. Strong bolds about half of every word.

export type BionicLevel = "subtle" | "strong";
export type Piece = { text: string; bold: boolean };

/** How many leading letters of a word are bold. 0 means the word is left as it is. */
export function leadLength(wordLength: number, level: BionicLevel = "strong"): number {
  if (level === "subtle") return wordLength <= 3 ? 0 : Math.max(1, Math.round(wordLength * 0.3));
  if (wordLength <= 1) return wordLength;
  if (wordLength <= 3) return 1;
  return Math.ceil(wordLength * 0.45);
}

const WORD = /(\p{L}[\p{L}\p{N}'’-]*)/u;

/**
 * Splits text into pieces. Words become a bold lead plus the rest; everything else (spaces, numbers, punctuation)
 * is kept as is. Joining all piece texts gives the original text back exactly.
 */
export function splitText(text: string, level: BionicLevel = "strong"): Piece[] {
  const out: Piece[] = [];
  for (const part of text.split(WORD)) {
    if (part === "") continue;
    if (!WORD.test(part) || part !== part.match(WORD)?.[0]) {
      out.push({ text: part, bold: false });
      continue;
    }
    const chars = [...part];
    const n = leadLength(chars.length, level);
    if (n === 0) {
      out.push({ text: part, bold: false });
      continue;
    }
    out.push({ text: chars.slice(0, n).join(""), bold: true });
    if (chars.length > n) out.push({ text: chars.slice(n).join(""), bold: false });
  }
  return out;
}
