import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@habit/shared";
import type { AiSettings } from "@/lib/ui-prefs";
import { prepareMessages } from "./active";

const base: AiSettings = {
  enabled: true,
  model: "my-model",
  url: "http://127.0.0.1:11434",
  provider: "ollama",
  consent: [],
  foldSystem: false,
};
const msgs: ChatMessage[] = [
  { role: "system", content: "S" },
  { role: "user", content: "U" },
];

describe("prepareMessages (plan 0078)", () => {
  it("is the identity when the fold is off, and folds when on", () => {
    expect(prepareMessages(msgs, base)).toBe(msgs);
    expect(prepareMessages(msgs, { ...base, foldSystem: true })).toEqual([{ role: "user", content: "S\n\n---\n\nU" }]);
  });
});
