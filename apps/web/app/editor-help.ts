// The small print about the code editor, shown behind the ? button next to Run instead of as lines under the editor.

export const TAB_HELP = "Tab indents. Press Esc, then Tab, to leave the editor.";

const ADDED: Record<string, string> = {
  cpp: "C++ gets all the standard headers (#include <bits/stdc++.h>) and using namespace std; added for you.",
  java: "Java gets import java.util.*; java.util.function.*; and java.util.stream.* added for you.",
};

/** The text of the ? button for a language ("cpp", "java", "javascript"). */
export function editorHelp(lang: string): string {
  return ADDED[lang] ? `${TAB_HELP} ${ADDED[lang]}` : TAB_HELP;
}
