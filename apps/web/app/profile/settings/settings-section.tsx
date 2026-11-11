import type { ReactNode } from "react";

/** Wraps one settings card so the client shell can hide it while searching. Renders no styling of its own. */
export function SettingsSection({ id, children }: { id: string; children: ReactNode }) {
  return <div data-settings-section={id}>{children}</div>;
}

/** One category block: a heading and its sections. */
export function SettingsBlock({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} data-category-block={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24 space-y-4">
      <h3 id={`${id}-heading`} className="text-xl font-semibold">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
