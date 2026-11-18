// Small presentational pieces shared by the pages, styled to the Dojo design system (DESIGN.md, plan 0083).
// Every piece uses the theme tokens (bg-surface, border-line, text-muted, bg-primary...) so themes repaint them.
// /dev/components shows all of them in light and dark.
import Link from "next/link";

// ---- buttons

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors duration-120 ease-dojo " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-line-strong bg-surface text-foreground hover:bg-surface-2",
  quiet: "text-muted hover:bg-surface-2 hover:text-foreground",
  danger: "border border-danger text-danger hover:bg-danger/10",
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm max-md:h-10",
};

/** Class names for a button (or a link or SubmitButton that should look like one). */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = ""): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]} ${extra}`.trim();
}

/** A plain button. Labels start with a verb ("Start session", "Mark done"). Inside a form it submits unless `type` says otherwise. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

/** A link that looks like a button. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

// ---- inputs

export const INPUT_CLASS =
  "h-9 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-foreground placeholder:text-muted " +
  "transition-colors duration-120 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/30 " +
  "disabled:opacity-45 aria-invalid:border-danger";

/** A labelled form field: visible label above, help or error text below. `children` is the input, select or textarea. */
export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={`${htmlFor}-help`} className="text-xs text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/** A text input with a visible label. */
export function TextInput({
  id,
  label,
  help,
  error,
  className = "",
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & { id: string; label: string; help?: string; error?: string }) {
  return (
    <Field label={label} htmlFor={id} help={help} error={error} className={className}>
      <input
        id={id}
        className={INPUT_CLASS}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        {...rest}
      />
    </Field>
  );
}

// ---- cards

/**
 * A card: surface, 1px line, no shadow at rest. With `href` the whole card is a link and gets `line-strong` and
 * `shadow-sm` on hover. `subject` adds a 3px left edge in that subject's colour.
 */
export function Card({
  children,
  href,
  subject,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  subject?: Subject;
  className?: string;
}) {
  const edge = subject ? `border-l-[3px] ${SUBJECT_EDGE[subject]}` : "";
  const base = `block rounded-md border border-line bg-surface p-5 ${edge} ${className}`;
  if (href) {
    return (
      <Link href={href} className={`${base} transition-[border-color,box-shadow] duration-120 ease-dojo hover:border-line-strong hover:shadow-sm`}>
        {children}
      </Link>
    );
  }
  return <div className={base}>{children}</div>;
}

export type Subject = "dsa" | "sd" | "lld" | "core" | "beh" | "mock";
const SUBJECT_EDGE: Record<Subject, string> = {
  dsa: "border-l-cat-dsa",
  sd: "border-l-cat-sd",
  lld: "border-l-cat-lld",
  core: "border-l-cat-core",
  beh: "border-l-cat-beh",
  mock: "border-l-cat-mock",
};

export function Stat({ label, value, hint, href, className = "" }: { label: string; value: string; hint?: string; href?: string; className?: string }) {
  const content = (
    <>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={`block rounded-md border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm ${className}`}>
        {content}
      </Link>
    );
  }
  return <div className={`rounded-md border border-line bg-surface p-4 ${className}`}>{content}</div>;
}

/** Shown at the bottom of pages where Simple mode hid something. */
export function SimpleHint() {
  return (
    <p className="text-xs text-muted">
      Simple mode hides some tools. Turn it off in{" "}
      <Link href="/profile/settings" className="underline hover:text-foreground">
        Profile → Settings
      </Link>
      .
    </p>
  );
}

// ---- badges

/** Difficulty as a tinted badge: the diff colour as text on a 12% tint of it. */
export function Difficulty({ level }: { level?: string | null }) {
  if (!level) return null;
  const key = level.toLowerCase();
  const color =
    key === "easy"
      ? "text-diff-easy bg-diff-easy/12"
      : key === "medium"
        ? "text-diff-medium bg-diff-medium/12"
        : key === "hard"
          ? "text-diff-hard bg-diff-hard/12"
          : "text-muted bg-surface-2";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={`inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium ${color}`} aria-label={`Difficulty: ${label}`}>
      {label}
    </span>
  );
}

/** A small tag: 20px high, text-xs, radius sm. `tone` picks the colour. */
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  const cls = {
    neutral: "bg-surface-2 text-muted",
    primary: "bg-primary-soft text-primary",
    success: "bg-success/12 text-success",
    warning: "bg-warning/12 text-warning",
    danger: "bg-danger/12 text-danger",
  }[tone];
  return <span className={`inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium ${cls}`}>{children}</span>;
}

// ---- icons (Lucide-style inline SVG, 1.75 stroke)

function Icon({ children, className = "size-4", label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {label && <title>{label}</title>}
      {children}
    </svg>
  );
}

export function FlameIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </Icon>
  );
}

export function BoltIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </Icon>
  );
}

export function CheckIcon({ className, label }: { className?: string; label?: string }) {
  return (
    <Icon className={className} label={label}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

// ---- status

/**
 * Solved marks, like a chat app's ticks. One primary check: solved here (every test passed in the editor). A primary
 * check followed by a grey one: solved here and also seen on LeetCode. One faint grey check: only seen on LeetCode so
 * far. Without `here`: a success check (solved), a warning ring (needs re-solve) or a faint ring (not solved).
 */
export function StatusMark({ state, here, onLeetCode }: { state: "solved" | "resolve" | "none"; here?: boolean; onLeetCode?: boolean }) {
  if (state === "solved" && here !== undefined) {
    const both = here && !!onLeetCode;
    const label = both ? "Solved here and on LeetCode" : here ? "Solved here" : "Solved on LeetCode, not solved here yet";
    return (
      <svg
        className={`h-4 shrink-0 ${both ? "w-[26px]" : "w-4"}`}
        viewBox={both ? "0 0 26 16" : "0 0 16 16"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label={label}
        role="img"
      >
        <title>{label}</title>
        {here ? <path className="text-success" d="m3.5 8.5 3 3 6-7" /> : <path className="text-muted" opacity="0.6" d="m3.5 8.5 3 3 6-7" />}
        {both && <path className="text-muted" d="m13.5 8.5 3 3 6-7" />}
      </svg>
    );
  }
  if (state === "solved") {
    return <CheckIcon className="size-4 text-success" label="Solved" />;
  }
  if (state === "resolve") {
    return (
      <svg className="size-4 shrink-0 text-warning" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-label="Needs re-solve" role="img">
        <title>Needs re-solve</title>
        <circle cx="8" cy="8" r="5.5" strokeDasharray="3 2" />
      </svg>
    );
  }
  return (
    <svg className="size-4 shrink-0 text-line-strong" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-label="Unsolved" role="img">
      <title>Unsolved</title>
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  );
}

// ---- progress

/**
 * A 6px bar, full radius, surface-2 track. `tone` "primary" for lessons and courses, "reward" for XP. With `showCount`
 * the numbers sit beside it ("12 of 40").
 */
export function ProgressBar({
  value,
  max,
  label,
  tone = "primary",
  showCount = false,
}: {
  value: number;
  max: number;
  label: string;
  tone?: "primary" | "reward";
  showCount?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-surface-2 ${showCount ? "flex-1" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className={`anim-grow h-full rounded-full ${tone === "reward" ? "bg-reward" : "bg-primary"}`} style={{ width: `${pct}%` }} />
    </div>
  );
  if (!showCount) return bar;
  return (
    <div className="flex items-center gap-3">
      {bar}
      <span className="shrink-0 text-xs font-medium text-muted tabular-nums">
        {value} of {max}
      </span>
    </div>
  );
}

/** A small ring for the daily goal: 4px stroke, primary on surface-2. */
export function ProgressRing({ value, max, label, size = 40 }: { value: number; max: number; label: string; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value} of ${max}`} className="shrink-0 -rotate-90">
      <title>{`${label}: ${value} of ${max}`}</title>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-surface-2" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
      />
    </svg>
  );
}

// ---- streak and XP

/** Streak chip: reward-soft background, flame in reward, the number in foreground 600. */
export function StreakChip({ days, className = "" }: { days: number; className?: string }) {
  return (
    <span className={`gamify-only inline-flex h-7 items-center gap-1.5 rounded-full bg-reward-soft px-2.5 text-sm ${className}`} aria-label={`Streak: ${days} ${days === 1 ? "day" : "days"}`}>
      <FlameIcon className="size-4 text-reward" />
      <span className="font-semibold text-foreground tabular-nums">{days}</span>
    </span>
  );
}

/** XP chip: reward-soft background, bolt in reward, the number in foreground 600. */
export function XpChip({ xp, className = "" }: { xp: number; className?: string }) {
  return (
    <span className={`gamify-only inline-flex h-7 items-center gap-1.5 rounded-full bg-reward-soft px-2.5 text-sm ${className}`} aria-label={`${xp} XP`}>
      <BoltIcon className="size-4 text-reward" />
      <span className="font-semibold text-foreground tabular-nums">{xp}</span>
      <span className="text-xs text-muted">XP</span>
    </span>
  );
}

// ---- empty and loading

/** One line of plain text, one primary action, a small line icon. */
export function EmptyState({ icon, message, action }: { icon?: React.ReactNode; message: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line px-6 py-10 text-center">
      {icon && <span className="text-muted [&_svg]:size-5">{icon}</span>}
      <p className="text-sm text-muted">{message}</p>
      {action && (
        <ButtonLink href={action.href} size="sm">
          {action.label}
        </ButtonLink>
      )}
    </div>
  );
}

/** A skeleton block in surface-2 (only for waits over a second). */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div aria-hidden className={`anim-pulse rounded-sm bg-surface-2 ${className}`} />;
}

/** Page wrapper: wide content area next to the sidebar. `narrow` for reading/form pages. */
export function PageMain({ title, children, narrow = false, full = false }: { title: string; children: React.ReactNode; narrow?: boolean; full?: boolean }) {
  return (
    <main className={`anim-fade-up w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8 ${full ? "max-w-none" : narrow ? "max-w-4xl" : "max-w-7xl"}`}>
      <h1 className="sr-only">{title}</h1>
      {children}
    </main>
  );
}
