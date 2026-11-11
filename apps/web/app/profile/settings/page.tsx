import type { Metadata } from "next";
import { refresh } from "next/cache";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { formatLong } from "@habit/shared";
import { getExtensionStatus } from "@/lib/leetcode/extension";
import { getLeetCodeStatus } from "@/lib/leetcode/sync";
import { getFeedUrl, listLessonPatches } from "@/lib/packs";
import { getPlanStart } from "@/lib/tasks";
import { getAiSettings, getBuddySettings, getProfileName, getSimpleMode, setProfileName, type AiProviderId } from "@/lib/ui-prefs";
import { setBuddySettingsAction, setPlanStartAction, setSimpleModeAction } from "../../actions";
import { SubmitButton } from "../../submit-button";
import { PackImporter } from "../../pack-importer";
import { CustomColours, CustomFontPicker, ProfileEditor } from "../../custom-appearance";
import { ThemePicker } from "../../theme-picker";
import { PageMain } from "../../ui";
import { ExtensionCard, LeetCodeCard } from "../connections";
import { ProfileTabs } from "../profile-ui";
import { FeedUpdater } from "./feed-updater";
import { AiSettings } from "./ai-settings";
import { BuddyAppearance } from "./buddy-appearance";
import { SettingsShell } from "./settings-shell";
import { SettingsBlock, SettingsSection } from "./settings-section";
import type { SettingsCategory, SettingsEntry } from "./settings-search";
import { AccountLink } from "@/app/components/account-menu";
import { ProfileSettingsSkeleton } from "@/app/components/profile-skeleton";

export const metadata: Metadata = { title: "Settings" };

const PROVIDER_LABEL: Record<AiProviderId, string> = {
  ollama: "Ollama (on this computer)",
  claude: "Claude Code (Anthropic)",
  agy: "Antigravity (Google)",
  gemini: "Gemini CLI (Google)",
  codex: "Codex CLI (OpenAI)",
};

const HOSTED = process.env.HABIT_HOSTED === "1";

const CATEGORIES: SettingsCategory[] = [
  { id: "appearance", title: "Appearance and reading" },
  { id: "plan", title: "Study plan" },
  { id: "practice", title: "Practice and running code" },
  ...(HOSTED ? [] : [{ id: "ai", title: "AI and chat" }]),
  { id: "buddy", title: "Buddy and focus" },
  { id: "account", title: "Account and sync" },
  { id: "content", title: "Content and packs" },
  { id: "connections", title: "Connections" },
  { id: "profile", title: "Profile and portfolio" },
  { id: "backup", title: "Backup and restore" },
];

const ENTRIES: SettingsEntry[] = [
  { id: "theme", category: "appearance", title: "Appearance and reading", description: "Light, dark or system theme and reading style, saved in this browser.", keywords: ["theme", "dark mode", "light", "style", "font", "reading", "text size"] },
  { id: "customize", category: "appearance", title: "Make it yours", description: "Custom colours and fonts.", keywords: ["colour", "color", "accent", "font", "custom", "personalise"] },
  { id: "simple-mode", category: "appearance", title: "Simple mode", description: "Hides the power tools so each page shows what to do next.", keywords: ["simple mode", "boss fight", "cheat sheets", "diagrams", "reading list", "stuck list", "hide"] },
  { id: "plan-start", category: "plan", title: "Plan start", description: "The Monday week 1 began; changing it regenerates unfinished tasks.", keywords: ["plan start date", "week", "shift", "monday", "schedule", "16 weeks"] },
  { id: "tools", category: "practice", title: "Tools for running code", description: "See which compilers and runtimes are installed on this computer.", keywords: ["tools", "compiler", "C++", "Java", "Node", "Python", "run code", "installed", "check my tools"] },
  ...(HOSTED
    ? []
    : [
        { id: "ai", category: "ai", title: "AI help on your own computer", description: "Off until you turn it on; explains hints and reviews code with a model.", keywords: ["AI model", "Ollama", "Claude Code", "Gemini", "Codex", "Antigravity", "local ai", "chat", "provider", "review my code"] },
      ]),
  { id: "buddy", category: "buddy", title: "Accountability Buddy and Gentle Pacing", description: "A shame-free companion, gentle timers and pacing.", keywords: ["buddy name", "buddy tone", "pacing", "pomodoro", "timer", "focus", "adhd", "streak freeze", "pet", "petdex", "appearance"] },
  { id: "sync", category: "account", title: "Sync across devices", description: "Sign in to keep progress in step across devices.", keywords: ["sync", "sign in", "account", "devices", "log in", "sign out"] },
  { id: "packs", category: "content", title: "Add problems and lessons", description: "Import a content pack: a JSON file of lessons and problems.", keywords: ["packs", "content pack", "import", "json", "lessons", "problems", "course"] },
  { id: "feed", category: "content", title: "Updates and feeds", description: "Check an over-the-air content feed for new and updated packs.", keywords: ["feed", "updates", "ota", "url", "patches"] },
  { id: "connections", category: "connections", title: "LeetCode and browser extension", description: "LeetCode username, and the browser extension pairing key.", keywords: ["LeetCode", "LeetCode username", "pairing key", "extension", "browser", "sync solves", "chrome"] },
  { id: "profile-editor", category: "profile", title: "Profile", description: "Your display profile.", keywords: ["avatar", "display", "profile"] },
  { id: "portfolio-name", category: "profile", title: "Portfolio name", description: "Shown on your portfolio and certificates.", keywords: ["name", "learner", "certificate", "portfolio"] },
  { id: "backup-download", category: "backup", title: "Download a backup", description: "One JSON file with everything.", keywords: ["backup", "export", "download", "save data", "move computer"] },
  { id: "backup-restore", category: "backup", title: "Restore from a backup", description: "Replaces all current data with a backup file.", keywords: ["restore", "import", "delete data", "replace", "undo", "reset"] },
];

export default function SettingsPage({ searchParams }: PageProps<"/profile/settings">) {
  return (
    <PageMain title="Settings">
      <ProfileTabs active="/profile/settings" />
      <SettingsShell categories={CATEGORIES} entries={ENTRIES}>
        <SettingsBlock id="appearance" title="Appearance and reading">
          <SettingsSection id="theme">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h4 className="mb-1 font-semibold">Appearance and reading</h4>
              <p className="mb-3 text-sm text-muted">
                System follows your computer&apos;s light or dark setting. These choices are saved in this browser or app window, so they are not
                part of a backup.
              </p>
              <ThemePicker />
            </section>
          </SettingsSection>
          <SettingsSection id="customize">
            <section className="space-y-5 rounded-xl border border-line bg-surface p-4">
              <h4 className="font-semibold">Make it yours</h4>
              <CustomColours />
              <hr className="border-line" />
              <CustomFontPicker />
            </section>
          </SettingsSection>
          <SettingsSection id="simple-mode">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <InterfaceSettings />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="plan" title="Study plan">
          <SettingsSection id="plan-start">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <PlanSettings />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="practice" title="Practice and running code">
          <SettingsSection id="tools">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h4 className="mb-1 font-semibold">Tools for running code</h4>
              <p className="mb-3 text-sm text-muted">See which of C++, Java, Node and Python are installed on this computer and copy the command to install the rest.</p>
              <Link href="/profile/settings/tools" className="inline-block rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-background">
                Check my tools
              </Link>
            </section>
          </SettingsSection>
        </SettingsBlock>

        {!HOSTED && (
          <SettingsBlock id="ai" title="AI and chat">
            <SettingsSection id="ai">
              <section className="rounded-xl border border-line bg-surface p-4">
                <h4 className="mb-1 font-semibold">AI help on your own computer</h4>
                <p className="mb-3 text-sm text-muted">Off until you turn it on. Explains hints and reviews your code with a model that runs here.</p>
                <AiSettings />
              </section>
            </SettingsSection>
          </SettingsBlock>
        )}

        <SettingsBlock id="buddy" title="Buddy and focus">
          <SettingsSection id="buddy">
            <Suspense fallback={<ProfileSettingsSkeleton rows={3} />}>
              <BuddySettingsSection />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="account" title="Account and sync">
          <SettingsSection id="sync">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h4 className="mb-1 font-semibold">Sync across devices</h4>
              <p className="mb-3 text-sm text-muted">
                Sign in to keep your progress in step across devices. See sync status, run a sync and manage signed-in devices.
                Signed out, everything stays on this device.
              </p>
              <AccountLink signedIn />
            </section>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="content" title="Content and packs">
          <SettingsSection id="packs">
            <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <h4 className="font-semibold">Add problems and lessons</h4>
              <p className="text-sm text-muted">
                A content pack is one JSON file with new lessons and Run-button problems. It becomes a course in Learn. Another AI can write one for you from
                any source: the format and a ready-made prompt are in <code>docs/content-packs.md</code>. Check it first, then install.
              </p>
              <PackImporter />
            </section>
          </SettingsSection>
          <SettingsSection id="feed">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <ContentFeedSection />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="connections" title="Connections">
          <div id="leetcode" className="scroll-mt-24" />
          <SettingsSection id="connections">
            <div className="space-y-4">
              <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
                <Connections />
              </Suspense>
            </div>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="profile" title="Profile and portfolio">
          <SettingsSection id="profile-editor">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h4 className="mb-3 font-semibold">Profile</h4>
              <ProfileEditor />
            </section>
          </SettingsSection>
          <SettingsSection id="portfolio-name">
            <Suspense fallback={<ProfileSettingsSkeleton rows={1} />}>
              <PortfolioNameSection />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="backup" title="Backup and restore">
          <Suspense>
            <Status searchParams={searchParams} />
          </Suspense>
          <SettingsSection id="backup-download">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h4 className="font-semibold">Download a backup</h4>
              <p className="mt-1 mb-3 text-sm text-muted">
                One JSON file with everything: tasks, solves, notes, saved LeetCode submissions, study progress and practice logs. Keep it
                somewhere safe, or use it to move to another computer. The extension pairing key isn&apos;t included.
              </p>
              <a href="/api/backup" download className="inline-block rounded-lg bg-accent px-4 py-2 font-medium text-on-accent">
                Download backup
              </a>
            </section>
          </SettingsSection>
          <SettingsSection id="backup-restore">
            <section className="rounded-xl border border-line bg-surface p-4">
              <h4 className="font-semibold">Restore from a backup</h4>
              <p className="mt-1 mb-3 text-sm text-muted">
                <strong className="text-foreground">Replaces all your current data</strong> with the file&apos;s contents. A copy of your current
                data is saved to a <code>backups</code> folder next to your database first, so you can undo by restoring that file. All or nothing: if anything is wrong
                with the file, nothing changes.
              </p>
              <form action="/api/backup/restore" method="post" encType="multipart/form-data" className="space-y-3">
                <input
                  type="file"
                  name="file"
                  accept="application/json,.json"
                  required
                  aria-label="Backup file"
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-background file:px-3 file:py-1.5 file:text-foreground"
                />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 size-4" />
                  <span>Yes, replace everything with this backup.</span>
                </label>
                <button className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">Restore</button>
              </form>
            </section>
          </SettingsSection>
        </SettingsBlock>
      </SettingsShell>
    </PageMain>
  );
}

async function PortfolioNameSection() {
  await connection();
  const name = await getProfileName();
  async function save(formData: FormData) {
    "use server";
    await setProfileName(String(formData.get("profileName") ?? ""));
    refresh();
  }
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="mb-1 font-semibold">Portfolio name</h4>
      <p className="mb-3 text-sm text-muted">Shown on your portfolio and certificates. Leave it empty to use &quot;Learner&quot;.</p>
      <form action={save} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="profileName"
          defaultValue={name === "Learner" ? "" : name}
          placeholder="Learner"
          maxLength={60}
          aria-label="Portfolio name"
          className="rounded-lg border border-line bg-background px-3 py-2"
        />
        <SubmitButton className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">Save</SubmitButton>
      </form>
    </section>
  );
}

async function InterfaceSettings() {
  await connection();
  const simple = await getSimpleMode();
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Simple mode: {simple ? "on" : "off"}</h4>
      <p className="mt-1 mb-3 text-sm text-muted">
        Hides the power tools so each page shows what to do next: the boss fight, pattern cheat sheets, your diagrams, the reading list and
        the stuck-list history. Nothing is deleted and the pages stay reachable by their address.
      </p>
      <form action={setSimpleModeAction}>
        <input type="hidden" name="simple" value={simple ? "0" : "1"} />
        <SubmitButton className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">
          {simple ? "Turn Simple mode off" : "Turn Simple mode on"}
        </SubmitButton>
      </form>
    </section>
  );
}

async function PlanSettings() {
  await connection();
  const planStart = await getPlanStart();
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Plan start</h4>
      <p className="mt-1 mb-3 text-sm text-muted">
        Week 1 started on {formatLong(planStart)}. Weeks run Monday to Sunday, so any date snaps to its Monday. Changing it regenerates
        unfinished tasks for the new week; finished tasks and XP are kept.
      </p>
      <form action={setPlanStartAction} className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          name="planStart"
          defaultValue={planStart}
          aria-label="Plan start date"
          className="rounded-lg border border-line bg-background px-3 py-2"
        />
        <SubmitButton className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">Save</SubmitButton>
      </form>
    </section>
  );
}

async function Connections() {
  await connection();
  const [leetcode, extension] = await Promise.all([getLeetCodeStatus(), getExtensionStatus()]);
  return (
    <>
      <LeetCodeCard {...leetcode} />
      <ExtensionCard {...extension} />
    </>
  );
}

async function Status({ searchParams }: { searchParams: PageProps<"/profile/settings">["searchParams"] }) {
  const p = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const error = one(p.error);
  const restored = one(p.restored);
  if (error) {
    return (
      <p role="alert" className="rounded-xl border border-cat-mock bg-surface p-4 text-sm">
        {error.slice(0, 300)}
      </p>
    );
  }
  if (restored) {
    const copy = one(p.copy);
    return (
      <p role="status" className="rounded-xl border border-accent bg-surface p-4 text-sm">
        Restored {Number(restored) || 0} rows.{copy && <> Your previous data was saved to <code className="break-all">{copy.slice(0, 400)}</code>.</>}
      </p>
    );
  }
  return null;
}

async function ContentFeedSection() {
  await connection();
  const [feedUrl, patches] = await Promise.all([getFeedUrl(), listLessonPatches()]);
  return (
    <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Updates and feeds</h4>
      <p className="text-sm text-muted">
        Connect to an over-the-air content feed to check for new and updated problem packs.
      </p>
      <FeedUpdater initialFeedUrl={feedUrl} patches={patches} />
    </section>
  );
}

async function BuddySettingsSection() {
  await connection();
  const settings = await getBuddySettings();
  const ai = process.env.HABIT_HOSTED === "1" ? null : await getAiSettings();
  return (
    <section className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <div>
        <h4 className="font-semibold">Accountability Buddy &amp; Gentle Pacing</h4>
        <p className="mt-1 text-sm text-muted">
          Designed for ADHD and cognitive ease: an optional, shame-free co-working companion, gentle timers with soft nudges, and micro-step deconstruction.
        </p>
      </div>
      <form action={setBuddySettingsAction} className="space-y-4">
        <div>
          <label htmlFor="buddyMode" className="block text-sm font-medium">
            Buddy Tone
          </label>
          <select
            id="buddyMode"
            name="buddyMode"
            defaultValue={settings.mode}
            className="mt-1 block w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="off">Off (Standard Dojo)</option>
            <option value="calm">Sensei (Calm, grounding &amp; mindful)</option>
            <option value="peer">Study Buddy (Friendly, relatable &amp; encouraging)</option>
            <option value="coach">Coach (Direct, positive &amp; motivating)</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            When enabled, your buddy checks in at sprint start, offers gentle reminders, and celebrates effort without guilt.
          </p>
        </div>

        <div>
          <label htmlFor="buddyName" className="block text-sm font-medium">
            Buddy Name (optional)
          </label>
          <input
            id="buddyName"
            type="text"
            name="buddyName"
            defaultValue={settings.name}
            placeholder="e.g., Sensei, Maya, Coach"
            maxLength={50}
            className="mt-1 block w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="adhdPacing" className="block text-sm font-medium">
            Pacing Mode
          </label>
          <select
            id="adhdPacing"
            name="adhdPacing"
            defaultValue={settings.pacing}
            className="mt-1 block w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="gentle">Gentle pacing (Count-up timer, soft reminder at 20 min, no harsh cutoffs)</option>
            <option value="standard">Standard pacing (25 min Pomodoro countdown)</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            Gentle pacing avoids countdown anxiety by counting up and softly nudging when it is time to stretch.
          </p>
        </div>

        <SubmitButton className="rounded-lg bg-accent px-4 py-2 font-medium text-on-accent text-sm">
          Save pacing preferences
        </SubmitButton>
      </form>
      <BuddyAppearance aiEnabled={ai?.enabled ?? false} providerLabel={ai ? PROVIDER_LABEL[ai.provider] : ""} cloud={ai ? ai.provider !== "ollama" : false} />
    </section>
  );
}
