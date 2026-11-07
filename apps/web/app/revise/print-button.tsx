"use client";

/** Opens the browser's print dialog (save as PDF for a phone-friendly copy). Hidden in print. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface print:hidden">
      Print
    </button>
  );
}
