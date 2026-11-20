import type { ReactNode } from "react";

/** Where a setting is kept: in your data (follows your account), synced appearance, or only this browser or app window. */
export type SettingScope = "data" | "sync" | "device";
const SCOPE_TEXT: Record<SettingScope, string> = {
  data: "Saved with your data",
  sync: "Syncs when signed in",
  device: "This device only",
};

/** Wraps one settings card so the client shell can hide it while searching. `scope` shows where the setting is kept. */
export function SettingsSection({ id, scope, children }: { id: string; scope?: SettingScope; children: ReactNode }) {
  return (
    <div data-settings-section={id} className="relative">
      {scope && (
        <p className="mb-1.5 text-xs text-muted @min-[700px]:absolute @min-[700px]:top-6 @min-[700px]:right-6 @min-[700px]:mb-0">
          <span className={`mr-1.5 inline-block size-1.5 rounded-full align-middle ${scope === "device" ? "bg-muted" : "bg-primary"}`} aria-hidden />
          {SCOPE_TEXT[scope]}
        </p>
      )}
      {children}
    </div>
  );
}

/** One category block: a heading and its sections. */
export function SettingsBlock({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} data-category-block={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 space-y-4">
      <h2 id={`${id}-heading`} className="text-xl font-medium">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
