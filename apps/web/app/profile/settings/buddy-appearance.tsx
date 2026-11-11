"use client";

import { useEffect, useState } from "react";
import type { BuddyMood } from "@habit/shared";
import { BUILTIN_AVATARS, BuddyAvatar, type AvatarId } from "../../buddy/avatar";
import { DEFAULT_BUDDY_PREFS, onBuddyPrefs, readBuddyPrefs, resetBuddyPosition, writeBuddyPrefs, type BuddyPrefs } from "../../buddy/buddy-prefs";
import { AVATAR_ACCEPT, fileToDataUrl } from "../../buddy/import-avatar";
import { importPetZip, type PetMeta } from "../../buddy/pets/pet-package";
import { deletePet, listPets, loadPetSheetUrl, savePet } from "../../buddy/pets/pet-store";
import { PetSprite } from "../../buddy/pets/pet-sprite";

const PET_ZIP_MAX = 6 * 1024 * 1024;
const PETDEX_ERRORS: Record<string, string> = {
  bad_url: "That is not a Petdex pet link. It should look like https://petdex.dev/pets/shinchan.",
  not_found: "Could not find the pet's download on that page.",
  too_big: "That pet is too big to import (over 6 MB).",
  fetch_failed: "Could not reach petdex.dev. Check your connection, or download the zip and upload it here.",
  forbidden: "The request was refused.",
};

function PetCard({ meta, selected, onPick, onRemove }: { meta: PetMeta; selected: boolean; onPick: () => void; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    loadPetSheetUrl(meta.id)
      .then((u) => {
        if (!alive) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        made = u;
        setUrl(u);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [meta.id]);
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-sm ${selected ? "border-accent bg-accent/10" : "border-line bg-background"}`}>
      <label className="flex cursor-pointer flex-col items-center gap-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
        <input type="radio" name="buddyAvatar" value={`pet:${meta.id}`} checked={selected} onChange={onPick} className="sr-only" />
        <div className="flex h-16 items-center justify-center">
          {url ? <PetSprite sheetUrl={url} meta={meta} row="idle" size={56} /> : <span className="text-xs text-muted">Loading</span>}
        </div>
        <span className="font-medium">{meta.name}</span>
        {meta.description ? <span className="line-clamp-2 text-center text-xs text-muted">{meta.description}</span> : null}
      </label>
      <button type="button" className="mt-1 rounded-lg border border-line px-2 py-1 text-xs" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

const MOODS: BuddyMood[] = ["idle", "thinking", "sleeping", "excited"];
const SIZES: { id: BuddyPrefs["size"]; label: string }[] = [
  { id: "s", label: "Small" },
  { id: "m", label: "Medium" },
  { id: "l", label: "Large" },
];
const FREQ: { id: BuddyPrefs["frequency"]; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "rare", label: "Sometimes" },
  { id: "normal", label: "Often" },
];

/** Settings > Buddy appearance. Everything here is stored on this device only (localStorage). */
export function BuddyAppearance({ aiEnabled, providerLabel, cloud }: { aiEnabled: boolean; providerLabel: string; cloud: boolean }) {
  const [prefs, setPrefs] = useState<BuddyPrefs>(DEFAULT_BUDDY_PREFS);
  const [preview, setPreview] = useState<{ id: AvatarId; mood: BuddyMood } | null>(null);
  const [pending, setPending] = useState<string | null>(null); // imported image waiting for Save
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pets, setPets] = useState<PetMeta[]>([]);
  const [petLink, setPetLink] = useState("");
  const [petBusy, setPetBusy] = useState<string | null>(null);
  const [petError, setPetError] = useState<string | null>(null);

  useEffect(() => {
    listPets()
      .then(setPets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefs live in localStorage, so they can only be read after hydration
    setPrefs(readBuddyPrefs());
    return onBuddyPrefs(setPrefs);
  }, []);

  // Hover or focus on a card cycles the moods so the user sees every animation.
  useEffect(() => {
    if (!preview) return;
    const t = setInterval(() => {
      setPreview((p) => (p ? { ...p, mood: MOODS[(MOODS.indexOf(p.mood) + 1) % MOODS.length] } : p));
    }, 1400);
    return () => clearInterval(t);
  }, [preview?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only when another card is previewed

  const save = (patch: Partial<BuddyPrefs>) => setPrefs(writeBuddyPrefs(patch));

  async function onFile(file: File | undefined) {
    setError(null);
    setNote(null);
    setPending(null);
    if (!file) return;
    const r = await fileToDataUrl(file);
    if (!r.ok) setError(r.error);
    else setPending(r.dataUrl);
  }

  async function runPetImport(job: () => Promise<Uint8Array>) {
    setPetError(null);
    setNote(null);
    try {
      const bytes = await job();
      setPetBusy("Reading the pet...");
      const { pkg, meta } = await importPetZip(bytes);
      await savePet(pkg, meta);
      setPets(await listPets());
      save({ avatar: "pet", pet: { id: meta.id, name: meta.name, description: meta.description } });
      setNote(`${meta.name} is added and selected.`);
    } catch (e) {
      setPetError(e instanceof Error && e.message ? e.message : "Could not import that pet.");
    } finally {
      setPetBusy(null);
    }
  }

  const addFromLink = () =>
    runPetImport(async () => {
      setPetBusy("Downloading from petdex.dev...");
      let res: Response;
      try {
        res = await fetch("/api/buddy/petdex", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: petLink }),
        });
      } catch {
        throw new Error(PETDEX_ERRORS.fetch_failed);
      }
      if (!res.ok) {
        let code = "fetch_failed";
        try {
          code = ((await res.json()) as { error?: string }).error ?? code;
        } catch {
          // keep the generic code
        }
        throw new Error(PETDEX_ERRORS[code] ?? PETDEX_ERRORS.fetch_failed);
      }
      return new Uint8Array(await res.arrayBuffer());
    });

  const addFromFile = (file: File | undefined) => {
    if (!file) return;
    void runPetImport(async () => {
      if (file.size > PET_ZIP_MAX) throw new Error("That file is over 6 MB. Petdex pets are smaller than that.");
      return new Uint8Array(await file.arrayBuffer());
    });
  };

  async function removePet(meta: PetMeta) {
    try {
      await deletePet(meta.id);
      setPets(await listPets());
      if (prefs.pet?.id === meta.id) save({ avatar: DEFAULT_BUDDY_PREFS.avatar, pet: undefined });
      setNote(`${meta.name} removed.`);
    } catch {
      setPetError("Could not remove that pet.");
    }
  }

  const card = (id: AvatarId, label: string, src?: string) => {
    const selected = prefs.avatar === id;
    const mood = preview?.id === id ? preview.mood : "idle";
    return (
      <label
        key={id}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
          selected ? "border-accent bg-accent/10" : "border-line bg-background"
        }`}
        onMouseEnter={() => setPreview({ id, mood: "excited" })}
        onMouseLeave={() => setPreview(null)}
      >
        <input
          type="radio"
          name="buddyAvatar"
          value={id}
          checked={selected}
          onChange={() => save({ avatar: id })}
          onFocus={() => setPreview({ id, mood: "excited" })}
          onBlur={() => setPreview(null)}
          className="sr-only"
        />
        <BuddyAvatar id={id} mood={mood} size={64} customSrc={src} />
        <span className="font-medium">{label}</span>
      </label>
    );
  };

  const choice = <T extends string>(name: string, value: T, options: { id: T; label: string }[], onPick: (v: T) => void) => (
    <div role="radiogroup" aria-label={name} className="mt-1 flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.id}
          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
            value === o.id ? "border-accent bg-accent/10 font-medium" : "border-line bg-background"
          }`}
        >
          <input type="radio" name={name} checked={value === o.id} onChange={() => onPick(o.id)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div>
        <h5 className="text-sm font-semibold">Buddy appearance</h5>
        <p className="mt-1 text-xs text-muted">Saved on this device only. Changes apply right away.</p>
      </div>

      <div>
        <p className="text-sm font-medium">Avatar</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {BUILTIN_AVATARS.map((a) => card(a.id, a.label))}
          {prefs.customSrc ? card("custom", "Your image", prefs.customSrc) : null}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Pets from Petdex</p>
        <p className="mt-1 text-xs text-muted">
          Use a free animated pet as your Buddy.{" "}
          <a href="https://petdex.dev" target="_blank" rel="noopener noreferrer" className="underline">
            Find pets at petdex.dev
          </a>
          , then paste its link here or upload the zip you downloaded.
        </p>
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (petLink.trim() && !petBusy) void addFromLink();
          }}
        >
          <input
            type="url"
            value={petLink}
            onChange={(e) => setPetLink(e.target.value)}
            aria-label="Petdex link"
            placeholder="Paste a Petdex link, for example https://petdex.dev/pets/shinchan"
            className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
          <button type="submit" disabled={!!petBusy || !petLink.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-60">
            Add
          </button>
        </form>
        <label htmlFor="petZip" className="mt-3 block text-xs text-muted">
          Or upload a downloaded pet (.zip)
        </label>
        <input
          id="petZip"
          type="file"
          accept=".zip,application/zip"
          disabled={!!petBusy}
          onChange={(e) => {
            addFromFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="mt-1 block w-full text-sm"
        />
        {petBusy ? (
          <p role="status" className="mt-2 text-sm text-muted">
            {petBusy}
          </p>
        ) : null}
        {petError ? (
          <p role="alert" className="mt-2 text-sm text-muted">
            {petError}
          </p>
        ) : null}
        {pets.length ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {pets.map((m) => (
              <PetCard
                key={m.id}
                meta={m}
                selected={prefs.avatar === "pet" && prefs.pet?.id === m.id}
                onPick={() => save({ avatar: "pet", pet: { id: m.id, name: m.name, description: m.description } })}
                onRemove={() => void removePet(m)}
              />
            ))}
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted">
          Pets are made by the Petdex community; check each pet&apos;s page for its terms. Zen Dojo does not include any pets.
        </p>
      </div>

      <div>
        <label htmlFor="buddyImport" className="block text-sm font-medium">
          Import your own
        </label>
        <input
          id="buddyImport"
          type="file"
          accept={AVATAR_ACCEPT}
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="mt-1 block w-full text-sm"
        />
        <p className="mt-1 text-xs text-muted">PNG, JPEG, GIF, WebP or SVG, up to 300 KB. It is shown as a picture only and stays on this device.</p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-muted">
            {error}
          </p>
        ) : null}
        {pending ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <BuddyAvatar id="custom" mood="idle" size={64} customSrc={pending} />
            <button
              type="button"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent"
              onClick={() => {
                save({ avatar: "custom", customSrc: pending });
                setPending(null);
                setNote("Your avatar is saved.");
              }}
            >
              Save avatar
            </button>
            <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        ) : null}
        {prefs.customSrc ? (
          <button
            type="button"
            className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm"
            onClick={() => {
              save({ avatar: prefs.avatar === "custom" ? DEFAULT_BUDDY_PREFS.avatar : prefs.avatar, customSrc: undefined });
              setNote("Custom avatar removed.");
            }}
          >
            Remove custom avatar
          </button>
        ) : null}
        {note ? (
          <p role="status" className="mt-2 text-sm text-muted">
            {note}
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-medium">Size</p>
        {choice("Buddy size", prefs.size, SIZES, (size) => save({ size }))}
      </div>

      <div>
        <p className="text-sm font-medium">Talks by itself</p>
        {choice("Buddy talks", prefs.frequency, FREQ, (frequency) => save({ frequency }))}
        <p className="mt-1 text-xs text-muted">Sometimes is about every 12 minutes, Often about every 5 minutes.</p>
      </div>

      <div>
        <label className={`flex items-start gap-2 text-sm ${aiEnabled ? "" : "opacity-60"}`}>
          <input
            type="checkbox"
            className="mt-1"
            checked={aiEnabled && prefs.aiLines}
            disabled={!aiEnabled}
            onChange={(e) => save({ aiLines: e.target.checked })}
          />
          <span>
            <span className="font-medium">Use AI for what it says</span>
            {!aiEnabled ? <span className="block text-xs text-muted">Turn on local AI help first</span> : null}
          </span>
        </label>
        {aiEnabled && cloud ? (
          <p className="mt-1 text-xs text-muted">
            This asks {providerLabel} for a short sentence. Only the buddy&apos;s name and mood are sent, never your code or notes.
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className="rounded-lg border border-line px-3 py-1.5 text-sm"
        onClick={() => {
          resetBuddyPosition();
          setNote("Position reset to the bottom-left.");
        }}
      >
        Reset position
      </button>
    </div>
  );
}
