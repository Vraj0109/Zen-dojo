"use client";

import { buttonClass } from "../ui";

/** Opens the browser's print dialog (save as PDF for a phone-friendly copy). Hidden in print. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClass("outline", "sm", "print:hidden")}
    >
      Print
    </button>
  );
}
