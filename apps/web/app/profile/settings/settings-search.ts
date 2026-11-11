export type SettingsEntry = {
  id: string;
  title: string;
  /** Category id (matches a SettingsCategory.id). */
  category: string;
  description: string;
  keywords: string[];
};

export type SettingsCategory = { id: string; title: string };

/**
 * Returns the ids of entries that match the query. Case-insensitive; every typed word must appear
 * somewhere in the title, category title, description or keywords. An empty query matches everything.
 */
export function matchSettings(entries: SettingsEntry[], categories: SettingsCategory[], query: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return entries.map((e) => e.id);
  const catTitle = new Map(categories.map((c) => [c.id, c.title]));
  return entries
    .filter((e) => {
      const hay = [e.title, catTitle.get(e.category) ?? "", e.description, ...e.keywords].join(" \n ").toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .map((e) => e.id);
}
