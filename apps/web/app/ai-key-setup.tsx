"use client";

import { useState } from "react";
import { BYOK_ERROR_TEXT, type ByokErrorCode } from "@/lib/ai/byok";
import {
  BYOK_PRIVACY_LINE,
  BYOK_PROVIDERS,
  BYOK_PROVIDER_IDS,
  byokHeaders,
  forgetByok,
  isValidKey,
  isValidModel,
  saveByok,
  type ByokProviderId,
} from "@/lib/ai-key-store";
import { useByok } from "@/lib/use-byok";

/**
 * "Set up AI with your own key" (hosted site). Used in the chat empty state and in Settings. The key is kept only in this
 * browser (localStorage) and is sent in a request header with the person's own AI requests; the server never saves it.
 */
export function AiKeySetup({ compact = false }: { compact?: boolean }) {
  const saved = useByok();
  const [provider, setProvider] = useState<ByokProviderId>(saved?.provider ?? "anthropic");
  const [key, setKey] = useState("");
  const [model, setModel] = useState(saved?.model ?? "");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const info = BYOK_PROVIDERS[provider];

  const keyToUse = key.trim() || (saved && saved.provider === provider ? saved.key : "");

  function save() {
    const k = key.trim();
    if (!isValidKey(k)) return setNote({ ok: false, text: "That does not look like an API key. Paste the whole key." });
    if (!isValidModel(model.trim())) return setNote({ ok: false, text: "That model name has characters that are not allowed." });
    if (!saveByok({ provider, key: k, model: model.trim() })) return setNote({ ok: false, text: "This browser would not store the key (private window or blocked storage)." });
    setKey("");
    setNote({ ok: true, text: "Saved in this browser." });
  }

  async function test() {
    if (!isValidKey(keyToUse)) return setNote({ ok: false, text: "Paste your key first." });
    setTesting(true);
    setNote(null);
    try {
      const r = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json", ...byokHeaders({ provider, key: keyToUse, model: model.trim() }) },
        body: "{}",
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; reply?: string; error?: string };
      if (j.ok) setNote({ ok: true, text: `It works. The model answered: ${(j.reply ?? "").slice(0, 80)}` });
      else setNote({ ok: false, text: (j.error && BYOK_ERROR_TEXT[j.error as ByokErrorCode]) || "The test did not work. Check the key and try again." });
    } catch {
      setNote({ ok: false, text: BYOK_ERROR_TEXT.network });
    } finally {
      setTesting(false);
    }
  }

  function forget() {
    forgetByok();
    setKey("");
    setModel("");
    setNote({ ok: true, text: "Your key was removed from this browser." });
  }

  const btn = "rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-background disabled:opacity-50";
  return (
    <div className={compact ? "space-y-3 text-sm" : "space-y-4 text-sm"}>
      <div>
        <h4 className="font-semibold">Set up AI with your own key</h4>
        <p className="mt-1 text-muted">AI help here uses an API key from a provider you choose. {saved ? "A key is saved in this browser." : "No key is saved yet."}</p>
      </div>

      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Provider</legend>
        {BYOK_PROVIDER_IDS.map((id) => (
          <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${provider === id ? "border-accent" : "border-line"}`}>
            <input type="radio" name="byok-provider" checked={provider === id} onChange={() => setProvider(id)} />
            {BYOK_PROVIDERS[id].label}
          </label>
        ))}
      </fieldset>

      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>
          Open{" "}
          <a href={info.keyUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
            {info.keyUrlLabel}
          </a>
          .
        </li>
        {info.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
        <li>Paste it below and press Save. Use Test to check it.</li>
      </ol>
      <p className="text-muted">{info.cost}</p>

      <div className="space-y-2">
        <label className="block text-xs font-medium">
          API key ({info.keyHint})
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={saved && saved.provider === provider ? "A key is saved. Paste a new one to replace it." : "Paste your key"}
            className="mt-1 block w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium">
          Model (optional)
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={info.defaultModel}
            className="mt-1 block w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
        </label>
        <p className="text-xs text-muted">Leave the model empty to use {info.defaultModel}, a low-cost fast model.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={!key.trim()} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-on-accent disabled:opacity-50">
          Save key
        </button>
        <button type="button" onClick={() => void test()} disabled={testing || !keyToUse} className={btn}>
          {testing ? "Testing..." : "Test"}
        </button>
        <button type="button" onClick={forget} disabled={!saved} className={btn}>
          Forget my key
        </button>
      </div>
      {note && (
        <p role="status" className={note.ok ? "text-xs" : "text-xs text-muted"}>
          {note.text}
        </p>
      )}
      <p className="text-xs text-muted">{BYOK_PRIVACY_LINE}</p>
    </div>
  );
}
