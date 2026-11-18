// Every shared component and token on one page (plan 0083 step 5). Desktop app and `pnpm dev` only: not linked from the
// nav and a 404 on the hosted site.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isHosted } from "@/lib/hosted";
import { THEME_TOKENS } from "@/lib/theme";
import { Tabs } from "../../tabs";
import {
  Badge,
  BoltIcon,
  Button,
  ButtonLink,
  Card,
  CheckIcon,
  Difficulty,
  EmptyState,
  Field,
  FlameIcon,
  INPUT_CLASS,
  PageMain,
  ProgressBar,
  ProgressRing,
  Skeleton,
  Stat,
  StatusMark,
  StreakChip,
  TextInput,
  XpChip,
} from "../../ui";
import { SchemeToggle } from "./scheme-toggle";

export const metadata: Metadata = { title: "Components", robots: { index: false } };

const CATS = ["cat-dsa", "cat-sd", "cat-lld", "cat-core", "cat-beh", "cat-mock"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ComponentsPage() {
  if (isHosted()) notFound();
  return (
    <PageMain title="Components">
      <div className="space-y-10">
        <header className="space-y-3">
          <p className="text-2xl font-bold">Components</p>
          <p className="max-w-[68ch] text-base text-muted">
            The Dojo design system (DESIGN.md) in one place. The preview buttons change this window only and are not saved.
          </p>
          <SchemeToggle />
        </header>

        <Section title="Colour tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[...THEME_TOKENS, ...CATS].map((t) => (
              <div key={t} className="overflow-hidden rounded-md border border-line bg-surface">
                <div className="h-12 border-b border-line" style={{ background: `var(--${t})` }} />
                <p className="px-2 py-1.5 font-mono text-xs">{t}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <div className="space-y-2">
            <p className="text-3xl font-bold tabular-nums">36 big number</p>
            <p className="text-2xl font-bold">Page title, text-2xl</p>
            <p className="text-xl font-semibold">Section heading, text-xl</p>
            <p className="text-lg font-semibold">Card title, text-lg</p>
            <p className="max-w-[68ch] text-base">
              Body and lesson text at 16px with a 26px line height. Lesson columns stop at 68 characters so lines stay easy to follow.{" "}
              <a href="#type" className="text-primary underline underline-offset-2">
                A link in lesson text
              </a>
              .
            </p>
            <p className="text-sm text-muted">Secondary text, table cells and nav items, text-sm.</p>
            <p className="text-xs font-medium text-muted">Labels, badges and timestamps, text-xs</p>
            <p className="font-mono text-sm">const code = &quot;JetBrains Mono&quot;; // 0O 1l</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Start session</Button>
            <Button variant="secondary">Open notes</Button>
            <Button variant="quiet">Skip for now</Button>
            <Button variant="danger">Delete note</Button>
            <Button disabled>Run code</Button>
            <Button size="sm">Mark done</Button>
            <ButtonLink href="/dev/components" variant="secondary" size="sm">
              Go somewhere
            </ButtonLink>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <TextInput id="demo-name" label="Display name" placeholder="Sam" help="Shown on your public profile." />
            <TextInput id="demo-url" label="LeetCode user" defaultValue="not a user!" error="Use letters, digits and dashes only." />
            <Field label="Language" htmlFor="demo-lang">
              <select id="demo-lang" className={INPUT_CLASS}>
                <option>C++</option>
                <option>Java</option>
                <option>Python</option>
              </select>
            </Field>
            <TextInput id="demo-off" label="Disabled" disabled defaultValue="Can't change this" />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <p className="text-lg font-semibold">Plain card</p>
              <p className="mt-1 text-sm text-muted">No shadow at rest.</p>
            </Card>
            <Card href="/dev/components" subject="dsa">
              <p className="text-lg font-semibold">Linked card, DSA</p>
              <p className="mt-1 text-sm text-muted">Hover for line-strong and shadow-sm.</p>
            </Card>
            <Card subject="sd">
              <p className="text-lg font-semibold">System design edge</p>
              <p className="mt-1 text-sm text-muted">3px left edge in the subject colour.</p>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Solved" value="42" hint="of 201" />
            <Stat label="Streak" value="7 days" />
            <Stat label="Due for review" value="3" href="/dev/components" />
          </div>
        </Section>

        <Section title="Progress, streak and XP">
          <div className="grid max-w-3xl gap-4">
            <ProgressBar value={12} max={40} label="Course progress" showCount />
            <ProgressBar value={340} max={500} label="XP to next level" tone="reward" showCount />
            <ProgressBar value={3} max={10} label="No number" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProgressRing value={2} max={3} label="Daily goal" />
            <StreakChip days={7} />
            <XpChip xp={1240} />
            <span className="text-sm text-muted">(Chips show only when game features are on in Settings.)</span>
          </div>
        </Section>

        <Section title="Badges and status">
          <div className="flex flex-wrap items-center gap-3">
            <Difficulty level="easy" />
            <Difficulty level="medium" />
            <Difficulty level="hard" />
            <Badge>Neutral</Badge>
            <Badge tone="primary">New</Badge>
            <Badge tone="success">Passed</Badge>
            <Badge tone="warning">Due</Badge>
            <Badge tone="danger">Failed</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2"><StatusMark state="solved" /> Solved</span>
            <span className="flex items-center gap-2"><StatusMark state="solved" here onLeetCode /> Here and LeetCode</span>
            <span className="flex items-center gap-2"><StatusMark state="resolve" /> Re-solve</span>
            <span className="flex items-center gap-2"><StatusMark state="none" /> Not solved</span>
            <span className="flex items-center gap-2 text-muted"><FlameIcon /><BoltIcon /><CheckIcon /> Icons</span>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs
            label="Demo tabs"
            active="patterns"
            hrefFor={(id) => `/dev/components?tab=${id}`}
            tabs={[
              { id: "patterns", label: "Patterns" },
              { id: "all", label: "All problems", count: 201 },
              { id: "due", label: "Re-solve due", count: 3 },
            ]}
          />
        </Section>

        <Section title="Empty and loading">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState icon={<CheckIcon />} message="Nothing due for review today." action={{ label: "Practice a problem", href: "/dev/components" }} />
            <div className="space-y-3 rounded-md border border-line bg-surface p-5">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </Section>

        <Section title="Floating">
          <div className="max-w-sm rounded-lg border border-line-strong bg-surface p-6 shadow-lg">
            <p className="text-lg font-semibold">Dialog or menu</p>
            <p className="mt-1 text-sm text-muted">Radius lg, line-strong border, shadow-lg in light only.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" size="sm">Delete &quot;Two pointers&quot;</Button>
              <Button variant="quiet" size="sm">Keep it</Button>
            </div>
          </div>
        </Section>
      </div>
    </PageMain>
  );
}
