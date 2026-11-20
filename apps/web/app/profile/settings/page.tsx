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
import { AppearanceSyncNote } from "@/app/components/appearance-sync-note";
import { PageMain, buttonClass } from "../../ui";
import { ExtensionCard, LeetCodeCard } from "../connections";
import { PROFILE_PAGE_CLASS } from "../shared";
import { FeedUpdater } from "./feed-updater";
import { AiSettings } from "./ai-settings";
import { BuddyAppearance } from "./buddy-appearance";
import { ReaderModeToggle } from "./reader-mode-toggle";
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
  { id: "ai", title: "AI and chat" },
  { id: "buddy", title: "Buddy and focus" },
  { id: "account", title: "Account and sync" },
  { id: "content", title: "Content and packs" },
  { id: "connections", title: "Connections" },
  { id: "profile", title: "Profile and portfolio" },
  ...(HOSTED ? [] : [{ id: "backup", title: "Backup and restore" }]),
];

const ENTRIES: SettingsEntry[] = [
  { id: "theme", category: "appearance", title: "Appearance and reading", description: "Light, dark or system theme and reading style, saved in this browser.", keywords: ["theme", "dark mode", "light", "style", "font", "reading", "text size"] },
  { id: "customize", category: "appearance", title: "Make it yours", description: "Your own theme: colours for light and dark, fonts, corners and density; export and import it.", keywords: ["colour", "color", "accent", "font", "custom", "personalise", "theme editor", "corners", "density", "compact", "export", "import", "contrast"] },
  { id: "simple-mode", category: "appearance", title: "Simple mode", description: "Hides the power tools so each page shows what to do next.", keywords: ["simple mode", "boss fight", "cheat sheets", "diagrams", "reading list", "stuck list", "hide"] },
  { id: "reader-mode", category: "appearance", title: "Reader mode", description: "Read-only study for phones: hides Run and Submit, shows saved code read-only.", keywords: ["reader", "read only", "phone", "mobile", "study mode", "hide run", "submit"] },
  { id: "plan-start", category: "plan", title: "Plan start", description: "The Monday week 1 began; changing it regenerates unfinished tasks.", keywords: ["plan start date", "week", "shift", "monday", "schedule", "16 weeks"] },
  { id: "tools", category: "practice", title: "Tools for running code", description: "See which compilers and runtimes are installed on this computer.", keywords: ["tools", "compiler", "C++", "Java", "Node", "Python", "run code", "installed", "check my tools"] },
  HOSTED
    ? { id: "ai", category: "ai", title: "AI help with your own key", description: "Paste an API key from Anthropic, OpenAI or Google; it stays in this browser only.", keywords: ["AI model", "API key", "Claude", "OpenAI", "Gemini", "chat", "provider", "bring your own key", "review my code"] }
    : { id: "ai", category: "ai", title: "AI help on your own computer", description: "Off until you turn it on; explains hints and reviews code with a model.", keywords: ["AI model", "Ollama", "Claude Code", "Gemini", "Codex", "Antigravity", "local ai", "chat", "provider", "review my code"] },
  { id: "buddy", category: "buddy", title: "Accountability Buddy and Gentle Pacing", description: "A shame-free companion, gentle timers and pacing.", keywords: ["buddy name", "buddy tone", "pacing", "pomodoro", "timer", "focus", "adhd", "streak freeze", "pet", "petdex", "appearance"] },
  { id: "sync", category: "account", title: "Sync across devices", description: "Sign in to keep progress in step across devices.", keywords: ["sync", "sign in", "account", "devices", "log in", "sign out"] },
  { id: "packs", category: "content", title: "Add problems and lessons", description: "Import a content pack: a JSON file of lessons and problems.", keywords: ["packs", "content pack", "import", "json", "lessons", "problems", "course"] },
  { id: "feed", category: "content", title: "Updates and feeds", description: "Check an over-the-air content feed for new and updated packs.", keywords: ["feed", "updates", "ota", "url", "patches"] },
  { id: "connections", category: "connections", title: HOSTED ? "LeetCode" : "LeetCode and browser extension", description: HOSTED ? "Your LeetCode username." : "LeetCode username, and the browser extension pairing key.", keywords: ["LeetCode", "LeetCode username", "pairing key", "extension", "browser", "sync solves", "chrome"] },
  { id: "profile-editor", category: "profile", title: "Profile", description: "Your display profile.", keywords: ["avatar", "display", "profile"] },
  { id: "portfolio-name", category: "profile", title: "Portfolio name", description: "Shown on your portfolio and certificates.", keywords: ["name", "learner", "certificate", "portfolio"] },
  ...(HOSTED
    ? []
    : [
        { id: "backup-download", category: "backup", title: "Download a backup", description: "One JSON file with everything.", keywords: ["backup", "export", "download", "save data", "move computer"] },
        { id: "backup-restore", category: "backup", title: "Restore from a backup", description: "Replaces all current data with a backup file.", keywords: ["restore", "import", "delete data", "replace", "undo", "reset"] },
      ]),
];

export default function SettingsPage({ searchParams }: PageProps<"/profile/settings">) {
  return (
    <PageMain title="Settings" hideTitle className={PROFILE_PAGE_CLASS}>
      <SettingsShell categories={CATEGORIES} entries={ENTRIES}>
        <SettingsBlock id="appearance" title="Appearance and reading">
          <SettingsSection id="theme" scope="sync">
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="mb-1 text-lg font-medium">Appearance and reading</h3>
              <p className="mb-3 text-sm text-muted">
                System follows your computer&apos;s light or dark setting. These choices are saved in this browser or app window and, when you
                are signed in, follow you to your other devices.
              </p>
              <AppearanceSyncNote />
              <ThemePicker />
            </section>
          </SettingsSection>
          <SettingsSection id="customize" scope="sync">
            <section className="space-y-5 rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="text-lg font-medium">Make it yours</h3>
              <CustomColours />
              <hr className="border-line" />
              <CustomFontPicker />
            </section>
          </SettingsSection>
          <SettingsSection id="simple-mode" scope="data">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <InterfaceSettings />
            </Suspense>
          </SettingsSection>
          <SettingsSection id="reader-mode" scope="device">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <ReaderModeToggle />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="plan" title="Study plan">
          <SettingsSection id="plan-start" scope="data">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <PlanSettings />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="practice" title="Practice and running code">
          <SettingsSection id="tools" scope="device">
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="mb-1 text-lg font-medium">Tools for running code</h3>
              <p className="mb-3 text-sm text-muted">See which of C++, Java, Node and Python are installed on this computer and copy the command to install the rest.</p>
              <Link href="/profile/settings/tools" className={buttonClass("outline", "sm")}>
                Check my tools
              </Link>
            </section>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="ai" title="AI and chat">
          <SettingsSection id="ai" scope={HOSTED ? "device" : "data"}>
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="mb-1 text-lg font-medium">{HOSTED ? "AI help with your own key" : "AI help on your own computer"}</h3>
              <p className="mb-3 text-sm text-muted">
                {HOSTED ? "Uses an API key you paste here. It stays in this browser only." : "Off until you turn it on. Explains hints and reviews your code with a model that runs here."}
              </p>
              <AiSettings />
            </section>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="buddy" title="Buddy and focus">
          <SettingsSection id="buddy" scope="data">
            <Suspense fallback={<ProfileSettingsSkeleton rows={3} />}>
              <BuddySettingsSection />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="account" title="Account and sync">
          <SettingsSection id="sync">
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="mb-1 text-lg font-medium">Sync across devices</h3>
              <p className="mb-3 text-sm text-muted">
                Sign in to keep your progress in step across devices. See sync status, run a sync and manage signed-in devices.
                Signed out, everything stays on this device.
              </p>
              <AccountLink signedIn />
            </section>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="content" title="Content and packs">
          <SettingsSection id="packs" scope="data">
            <section className="space-y-3 rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="text-lg font-medium">Add problems and lessons</h3>
              <p className="text-sm text-muted">
                A content pack is one JSON file with new lessons and Run-button problems. It becomes a course in Learn. Another AI can write one for you from
                any source: the format and a ready-made prompt are in <code>docs/content-packs.md</code>. Check it first, then install.
              </p>
              <PackImporter />
            </section>
          </SettingsSection>
          <SettingsSection id="feed" scope="data">
            <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
              <ContentFeedSection />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="connections" title="Connections">
          <div id="leetcode" className="scroll-mt-24" />
          <SettingsSection id="connections" scope="data">
            <div className="space-y-4">
              <Suspense fallback={<ProfileSettingsSkeleton rows={2} />}>
                <Connections />
              </Suspense>
            </div>
          </SettingsSection>
        </SettingsBlock>

        <SettingsBlock id="profile" title="Profile and portfolio">
          <SettingsSection id="profile-editor" scope="device">
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="mb-3 text-lg font-medium">Profile</h3>
              <ProfileEditor />
            </section>
          </SettingsSection>
          <SettingsSection id="portfolio-name" scope="data">
            <Suspense fallback={<ProfileSettingsSkeleton rows={1} />}>
              <PortfolioNameSection />
            </Suspense>
          </SettingsSection>
        </SettingsBlock>

        {!HOSTED && <SettingsBlock id="backup" title="Backup and restore">
          <Suspense>
            <Status searchParams={searchParams} />
          </Suspense>
          <SettingsSection id="backup-download">
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="text-lg font-medium">Download a backup</h3>
              <p className="mt-1 mb-3 text-sm text-muted">
                One JSON file with everything: tasks, solves, notes, saved LeetCode submissions, study progress and practice logs. Keep it
                somewhere safe, or use it to move to another computer. The extension pairing key isn&apos;t included.
              </p>
              <a href="/api/backup" download className={buttonClass("primary", "sm")}>
                Download backup
              </a>
            </section>
          </SettingsSection>
          <SettingsSection id="backup-restore">
            <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
              <h3 className="text-lg font-medium">Restore from a backup</h3>
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
                  className="block w-full text-sm file:mr-3 file:mr-3 file:h-10 file:rounded-full file:border file:border-outline file:bg-transparent file:px-4 file:text-sm file:font-medium file:text-primary"
                />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 size-4 accent-primary" />
                  <span>Yes, replace everything with this backup.</span>
                </label>
                <button className={buttonClass("outline", "sm")}>Restore</button>
              </form>
            </section>
          </SettingsSection>
        </SettingsBlock>}
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
    <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
      <h3 className="mb-1 text-lg font-medium">Portfolio name</h3>
      <p className="mb-3 text-sm text-muted">Shown on your portfolio and certificates. Leave it empty to use &quot;Learner&quot;.</p>
      <form action={save} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="profileName"
          defaultValue={name === "Learner" ? "" : name}
          placeholder="Learner"
          maxLength={60}
          aria-label="Portfolio name"
          className="h-11 rounded-full border border-line-strong bg-surface-2 px-4 text-sm"
        />
        <SubmitButton className={buttonClass("outline", "sm")}>Save</SubmitButton>
      </form>
    </section>
  );
}

async function InterfaceSettings() {
  await connection();
  const simple = await getSimpleMode();
  return (
    <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
      <h3 className="text-lg font-medium">Simple mode: {simple ? "on" : "off"}</h3>
      <p className="mt-1 mb-3 text-sm text-muted">
        Hides the power tools so each page shows what to do next: the boss fight, pattern cheat sheets, your diagrams, the reading list and
        the stuck-list history. Nothing is deleted and the pages stay reachable by their address.
      </p>
      <form action={setSimpleModeAction}>
        <input type="hidden" name="simple" value={simple ? "0" : "1"} />
        <SubmitButton className={buttonClass("outline", "sm")}>
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
    <section className="rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
      <h3 className="text-lg font-medium">Plan start</h3>
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
          className="h-11 rounded-full border border-line-strong bg-surface-2 px-4 text-sm"
        />
        <SubmitButton className={buttonClass("outline", "sm")}>Save</SubmitButton>
      </form>
    </section>
  );
}

async function Connections() {
  await connection();
  const [leetcode, extension] = await Promise.all([getLeetCodeStatus(), HOSTED ? null : getExtensionStatus()]);
  return (
    <>
      <LeetCodeCard {...leetcode} />
      {extension && <ExtensionCard {...extension} />}
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
      <p role="alert" className="rounded-[16px] bg-danger-soft p-4 text-sm text-on-danger-soft">
        {error.slice(0, 300)}
      </p>
    );
  }
  if (restored) {
    const copy = one(p.copy);
    return (
      <p role="status" className="rounded-[16px] bg-primary-soft p-4 text-sm text-on-primary-soft">
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
    <section className="space-y-3 rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
      <h3 className="text-lg font-medium">Updates and feeds</h3>
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
    <section className="space-y-4 rounded-[28px] border border-line bg-surface p-5 dark:border-0 sm:px-6 sm:py-[22px]">
      <div>
        <h3 className="text-lg font-medium">Buddy and pacing</h3>
        <p className="mt-1 text-sm text-muted">
          Designed for ADHD and cognitive ease: an optional, shame-free co-working companion, gentle timers with soft nudges, and micro-step deconstruction.
        </p>
      </div>
      <form action={setBuddySettingsAction} className="space-y-4">
        <div>
          <label htmlFor="buddyMode" className="block text-sm font-medium">
            Buddy tone
          </label>
          <select
            id="buddyMode"
            name="buddyMode"
            defaultValue={settings.mode}
            className="mt-1 block w-full h-11 rounded-full border border-line-strong bg-surface-2 px-4 text-sm"
          >
            <option value="off">Off (Standard Dojo)</option>
            <option value="calm">Sensei (Calm, grounding &amp; mindful)</option>
            <option value="peer">Study Buddy (Friendly, relatable &amp; encouraging)</option>
            <option value="coach">Coach (Direct, positive &amp; motivating)</option>
          </select>
          <p className="mt-1 text-sm text-muted">
            When enabled, your buddy checks in at sprint start, offers gentle reminders, and celebrates effort without guilt.
          </p>
        </div>

        <div>
          <label htmlFor="buddyName" className="block text-sm font-medium">
            Buddy name (optional)
          </label>
          <input
            id="buddyName"
            type="text"
            name="buddyName"
            defaultValue={settings.name}
            placeholder="e.g., Sensei, Maya, Coach"
            maxLength={50}
            className="mt-1 block w-full h-11 rounded-full border border-line-strong bg-surface-2 px-4 text-sm"
          />
        </div>

        <div>
          <label htmlFor="adhdPacing" className="block text-sm font-medium">
            Pacing mode
          </label>
          <select
            id="adhdPacing"
            name="adhdPacing"
            defaultValue={settings.pacing}
            className="mt-1 block w-full h-11 rounded-full border border-line-strong bg-surface-2 px-4 text-sm"
          >
            <option value="gentle">Gentle pacing (Count-up timer, soft reminder at 20 min, no harsh cutoffs)</option>
            <option value="standard">Standard pacing (25 min Pomodoro countdown)</option>
          </select>
          <p className="mt-1 text-sm text-muted">
            Gentle pacing avoids countdown anxiety by counting up and softly nudging when it is time to stretch.
          </p>
        </div>

        <SubmitButton className={buttonClass("primary", "sm")}>
          Save pacing preferences
        </SubmitButton>
      </form>
      <BuddyAppearance aiEnabled={HOSTED || (ai?.enabled ?? false)} providerLabel={HOSTED ? "your AI provider" : ai ? PROVIDER_LABEL[ai.provider] : ""} cloud={HOSTED || (ai ? ai.provider !== "ollama" : false)} />
    </section>
  );
}
