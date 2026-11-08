// "Focus reading": the first letters of each word are bold, so the eye has an anchor in every word. Pure helpers; the
// DOM work is in app/focus-reading.tsx.

export type Piece = { text: string; bold: boolean };

/** How many leading letters of a word are bold: 1 for short words, about 45% of longer ones. */
export function leadLength(wordLength: number): number {
  if (wordLength <= 1) return wordLength;
  if (wordLength <= 3) return 1;
  return Math.ceil(wordLength * 0.45);
}

const WORD = /(\p{L}[\p{L}\p{N}'’-]*)/u;

/**
 * Splits text into pieces. Words become a bold lead plus the rest; everything else (spaces, numbers, punctuation)
 * is kept as is. Joining all piece texts gives the original text back exactly.
 */
export function splitText(text: string): Piece[] {
  const out: Piece[] = [];
  for (const part of text.split(WORD)) {
    if (part === "") continue;
    if (!WORD.test(part) || part !== part.match(WORD)?.[0]) {
      out.push({ text: part, bold: false });
      continue;
    }
    const n = leadLength([...part].length);
    const chars = [...part];
    out.push({ text: chars.slice(0, n).join(""), bold: true });
    if (chars.length > n) out.push({ text: chars.slice(n).join(""), bold: false });
  }
  return out;
}
