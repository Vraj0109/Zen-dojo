export interface ShortcutItem {
  keys: string[];
  macKeys?: string[];
  description: string;
  group: "Everywhere" | "Problem workspace" | "Review";
}

/** Groups in the order the ? sheet shows them. */
export const SHORTCUT_GROUPS: ShortcutItem["group"][] = ["Everywhere", "Problem workspace", "Review"];

export const SHORTCUTS: ShortcutItem[] = [
  { keys: ["?"], description: "Show keyboard shortcuts", group: "Everywhere" },
  { keys: ["Esc"], description: "Close dialog or menu", group: "Everywhere" },
  { keys: ["Ctrl", "B"], macKeys: ["⌘", "B"], description: "Open or close the menu on full-screen pages", group: "Everywhere" },
  { keys: ["Ctrl", "Shift", "Z"], macKeys: ["⌘", "Shift", "Z"], description: "Toggle Zen mode", group: "Everywhere" },
  { keys: ["Ctrl", "'"], macKeys: ["⌘", "'"], description: "Run examples and your cases", group: "Problem workspace" },
  { keys: ["Ctrl", "Enter"], macKeys: ["⌘", "Return"], description: "Submit (every case, then save)", group: "Problem workspace" },
  { keys: ["Ctrl", "S"], macKeys: ["⌘", "S"], description: "Save draft", group: "Problem workspace" },
  { keys: ["Alt", "→"], macKeys: ["⌥", "→"], description: "Next case tab", group: "Problem workspace" },
  { keys: ["Alt", "←"], macKeys: ["⌥", "←"], description: "Previous case tab", group: "Problem workspace" },
  { keys: ["Alt", "1…9"], macKeys: ["⌥", "1…9"], description: "Jump to case 1–9", group: "Problem workspace" },
  { keys: ["Ctrl", "B"], macKeys: ["⌘", "B"], description: "Show or hide the problem pane", group: "Problem workspace" },
  { keys: ["Ctrl", "J"], macKeys: ["⌘", "J"], description: "Show or hide the results pane", group: "Problem workspace" },
  { keys: ["Space"], description: "Show answer", group: "Review" },
  { keys: ["1…4"], description: "Rate card (Shaky, Okay, Solid, Can teach)", group: "Review" },
];
