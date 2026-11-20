// Small presentational pieces shared by the pages, styled to Material 3 Expressive (plan 0085).
// Every piece uses the theme tokens (bg-surface, border-line, text-muted, bg-primary...) so themes repaint them.
// /dev/components shows all of them in light and dark.
import Link from "next/link";

// ---- buttons

export type ButtonVariant = "primary" | "tonal" | "secondary" | "outline" | "quiet" | "danger" | "reward";
export type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-120 ease-dojo " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  tonal: "bg-primary-soft text-on-primary-soft hover:bg-primary-soft/80",
  secondary: "bg-primary-soft text-on-primary-soft hover:bg-primary-soft/80", // alias for tonal
  outline: "border border-outline bg-transparent text-primary hover:bg-primary-soft/20",
  quiet: "bg-transparent text-muted hover:bg-surface-2 hover:text-foreground",
  danger: "border border-danger text-danger hover:bg-danger-soft/30",
  reward: "bg-reward-soft text-on-reward-soft hover:bg-reward-soft/80",
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-sm max-md:h-12",
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
  "h-12 w-full rounded-full border border-line-strong bg-surface-2 px-5 text-sm text-foreground placeholder:text-muted " +
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

/** A search field: 48px pill on surface-2, magnifier icon, sr-only label. */
export function SearchInput({
  id = "search",
  label = "Search",
  placeholder = "Search...",
  className = "",
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> & { id?: string; label?: string; placeholder?: string }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="pointer-events-none absolute left-4 text-muted" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        className={`${INPUT_CLASS} pl-11`}
        {...rest}
      />
    </div>
  );
}

// ---- cards

export type Subject = "dsa" | "sd" | "lld" | "core" | "beh" | "mock";
const SUBJECT_EDGE: Record<Subject, string> = {
  dsa: "border-l-cat-dsa",
  sd: "border-l-cat-sd",
  lld: "border-l-cat-lld",
  core: "border-l-cat-core",
  beh: "border-l-cat-beh",
  mock: "border-l-cat-mock",
};

/**
 * A card: surface, 1px line in light mode (no border in dark mode), rounded-lg (24px).
 * With `href` the whole card is a link and gets `line-strong` and `shadow-sm` on hover.
 */
export function Card({
  children,
  href,
  subject,
  variant = "surface",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  subject?: Subject;
  variant?: "surface" | "hero";
  className?: string;
}) {
  const edge = subject ? `border-l-[3px] ${SUBJECT_EDGE[subject]}` : "";
  const base =
    variant === "hero"
      ? `block rounded-xl bg-primary-container text-on-primary-container p-6 ${className}`
      : `block rounded-lg border border-line dark:border-0 bg-surface p-5 ${edge} ${className}`;
  if (href) {
    return (
      <Link href={href} className={`${base} transition-[border-color,box-shadow] duration-120 ease-dojo hover:border-line-strong hover:shadow-sm`}>
        {children}
      </Link>
    );
  }
  return <div className={base}>{children}</div>;
}

/** Hero cards: rounded-xl (32px) on primary-container. */
export function HeroCard({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <Card variant="hero" href={href} className={className}>
      {children}
    </Card>
  );
}

/** Filter chip: 36px tall, rounded-sm (10px), outlined; primary-soft when selected. */
export function FilterChip({
  label,
  selected = false,
  onClick,
  className = "",
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex h-9 items-center justify-center rounded-sm px-3.5 text-sm font-medium transition-colors ${
        selected
          ? "bg-primary-soft text-on-primary-soft border border-transparent font-semibold"
          : "border border-line-strong bg-transparent text-foreground hover:bg-surface-2"
      } ${className}`}
    >
      {label}
    </button>
  );
}

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
      <Link href={href} className={`block rounded-lg border border-line dark:border-0 bg-surface p-4 transition-[border-color,box-shadow] duration-120 hover:border-line-strong hover:shadow-sm ${className}`}>
        {content}
      </Link>
    );
  }
  return <div className={`rounded-lg border border-line dark:border-0 bg-surface p-4 ${className}`}>{content}</div>;
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

// ---- badges and shapes

export const SCALLOP_PATH =
  "M50 4 61 13 75 10 80 24 94 30 90 44 98 56 87 66 88 80 74 83 66 95 52 90 38 96 30 84 16 81 15 67 4 57 12 44 8 30 22 24 27 10 41 12z";

/** Scalloped badge shape for streak, level and badges. */
export function Scallop({
  size = 48,
  fill = "var(--reward-soft)",
  children,
  className = "",
}: {
  size?: number;
  fill?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="absolute inset-0 size-full" aria-hidden>
        <path d={SCALLOP_PATH} fill={fill} />
      </svg>
      <div className="relative z-10 flex items-center justify-center font-semibold">{children}</div>
    </div>
  );
}

/** Difficulty as coloured text (no pill): easy success, medium warning, hard danger. */
export function Difficulty({ level, className = "" }: { level?: string | null; className?: string }) {
  if (!level) return null;
  const key = level.toLowerCase();
  const color = key === "easy" ? "text-success" : key === "medium" ? "text-warning" : key === "hard" ? "text-danger" : "text-muted";
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return <span className={`text-sm font-medium whitespace-nowrap ${color} ${className}`}>{label}</span>;
}

/** A small tag: 20px high, text-xs, radius sm. `tone` picks the colour. */
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  const cls = {
    neutral: "bg-surface-2 text-muted",
    primary: "bg-primary-soft text-on-primary-soft",
    success: "bg-primary-soft/60 text-success",
    warning: "bg-reward-soft/60 text-warning",
    danger: "bg-danger-soft/60 text-danger",
  }[tone];
  return <span className={`inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium ${cls}`}>{children}</span>;
}

/** Subject rounded shape in the subject tone (DSA rounded square, SD circle, LLD leaf, core soft square, behavioural reversed leaf). */
export function SubjectShape({
  subject,
  children,
  className = "",
}: {
  subject: Subject;
  children?: React.ReactNode;
  className?: string;
}) {
  const shapeClass: Record<Subject, string> = {
    dsa: "bg-cat-dsa text-on-cat-dsa rounded-xl",
    sd: "bg-cat-sd text-on-cat-sd rounded-full",
    lld: "bg-cat-lld text-on-cat-lld rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm",
    core: "bg-cat-core text-on-cat-core rounded-2xl",
    beh: "bg-cat-beh text-on-cat-beh rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm",
    mock: "bg-cat-mock text-on-cat-mock rounded-xl",
  };
  return (
    <div className={`grid size-11 shrink-0 place-items-center font-medium ${shapeClass[subject]} ${className}`}>
      {children}
    </div>
  );
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
 * Status mark:
 * - done: filled primary circle with a check
 * - due: reward-soft circle
 * - not started: 2px line-strong ring
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
    return (
      <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-primary text-on-primary" aria-label="Solved" role="img">
        <CheckIcon className="size-3.5" />
      </span>
    );
  }
  if (state === "resolve") {
    return (
      <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-reward-soft" aria-label="Needs re-solve" role="img">
        <span className="size-2 rounded-full bg-reward" />
      </span>
    );
  }
  return (
    <span className="size-[22px] shrink-0 rounded-full border-2 border-line-strong" aria-label="Unsolved" role="img" />
  );
}

// ---- progress

/**
 * 10px pill track on surface-2 with fill in primary, and a number beside it.
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
      className={`h-2.5 overflow-hidden rounded-full bg-surface-2 ${showCount ? "flex-1" : ""}`}
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

/** WavyProgress variant for XP: an SVG wave for the done part and a straight line for the rest. */
export function WavyProgress({
  value,
  max,
  label = "XP progress",
  className = "",
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const split = Math.round(2 + pct * 296);

  let waveD = "M2 8";
  for (let x = 16; x <= split; x += 14) {
    waveD += ` T${x} 8`;
  }
  if (split > 2 && !waveD.includes("T")) {
    waveD = `M2 8 Q${(2 + split) / 2} 2 ${split} 8`;
  }
  const lineD = `M${Math.min(split + 4, 298)} 8 H298`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <svg
        role="img"
        aria-label={label}
        width="100%"
        height="16"
        viewBox="0 0 300 16"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <title>{label}</title>
        {pct > 0 && (
          <path
            d={waveD}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary transition-all duration-300"
          />
        )}
        {pct < 1 && (
          <path
            d={lineD}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-primary-soft opacity-60"
          />
        )}
      </svg>
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

/** Streak chip: reward-soft background, flame in reward, the number in foreground. */
export function StreakChip({ days, className = "" }: { days: number; className?: string }) {
  return (
    <span className={`gamify-only inline-flex h-8 items-center gap-1.5 rounded-full bg-reward-soft px-3 text-sm ${className}`} aria-label={`Streak: ${days} ${days === 1 ? "day" : "days"}`}>
      <FlameIcon className="size-4 text-reward" />
      <span className="font-semibold text-on-reward-soft tabular-nums">{days}</span>
    </span>
  );
}

/** XP chip: reward-soft background, bolt in reward, the number in foreground. */
export function XpChip({ xp, className = "" }: { xp: number; className?: string }) {
  return (
    <span className={`gamify-only inline-flex h-8 items-center gap-1.5 rounded-full bg-reward-soft px-3 text-sm ${className}`} aria-label={`${xp} XP`}>
      <BoltIcon className="size-4 text-reward" />
      <span className="font-semibold text-on-reward-soft tabular-nums">{xp}</span>
      <span className="text-xs text-on-reward-soft/80">XP</span>
    </span>
  );
}

// ---- empty and loading

/** One line of plain text, one primary action, a small line icon. */
export function EmptyState({ icon, message, action }: { icon?: React.ReactNode; message: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-10 text-center">
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
  return <div aria-hidden className={`anim-pulse rounded-md bg-surface-2 ${className}`} />;
}

/**
 * Page wrapper inside the shell's <main>. Wide by default (the user prefers wide layouts): up to 1360px, centred.
 * `narrow` for forms and reading pages, `full` for pages that manage their own scroll areas (Practice, workspaces).
 * `title` is a visually hidden h1 for pages that show their own visible heading as something else; pages with a
 * visible h1 pass `hideTitle`.
 */
export function PageMain({
  title,
  children,
  narrow = false,
  full = false,
  hideTitle = false,
  wide = false,
  className = "",
}: {
  title: string;
  children?: React.ReactNode;
  narrow?: boolean;
  /** Reading pages with side panels (lessons): up to 1680px so big screens give the article the room. */
  wide?: boolean;
  full?: boolean;
  hideTitle?: boolean;
  className?: string;
}) {
  const h1 = hideTitle ? null : <h1 className="sr-only">{title}</h1>;
  if (full) {
    return (
      <div className={`anim-fade flex min-h-0 w-full min-w-0 flex-1 flex-col ${className}`}>
        {h1}
        {children}
      </div>
    );
  }
  return (
    <div
      className={`anim-fade mx-auto w-full min-w-0 px-4 pt-5 pb-10 sm:px-6 md:px-8 md:pt-7 ${narrow ? "max-w-4xl" : wide ? "max-w-[1680px]" : "max-w-[1360px]"} ${className}`}
    >
      {h1}
      {children}
    </div>
  );
}
