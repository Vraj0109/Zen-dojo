import { describe, expect, it } from "vitest";
import type { ChatMessage } from "@habit/shared";
import type { AiSettings } from "@/lib/ui-prefs";
import { activeModel, activeUrl, prepareMessages } from "./active";

const base: AiSettings = {
  enabled: true,
  model: "llama3.2:3b",
  url: "http://127.0.0.1:11434",
  provider: "ollama",
  consent: [],
  lmstudioUrl: "http://127.0.0.1:1234",
  lmstudioModel: "qwen/qwen3-4b",
  foldSystem: false,
};
const msgs: ChatMessage[] = [
  { role: "system", content: "S" },
  { role: "user", content: "U" },
];

describe("active provider values (plan 0078)", () => {
  it("uses the Ollama values for ollama and the LM Studio values for lmstudio", () => {
    expect([activeModel(base), activeUrl(base)]).toEqual(["llama3.2:3b", "http://127.0.0.1:11434"]);
    const lm = { ...base, provider: "lmstudio" as const };
    expect([activeModel(lm), activeUrl(lm)]).toEqual(["qwen/qwen3-4b", "http://127.0.0.1:1234"]);
  });

  it("prepareMessages is the identity when the fold is off, and folds when on", () => {
    expect(prepareMessages(msgs, base)).toBe(msgs);
    expect(prepareMessages(msgs, { ...base, foldSystem: true })).toEqual([{ role: "user", content: "S\n\n---\n\nU" }]);
  });
});
