import { connection } from "next/server";
import { isReaderMode } from "@/lib/reader-mode";
import { setReaderModeAction } from "../../actions";
import { SubmitButton } from "../../submit-button";

/** Settings card for reader mode (read-only study, no Run). Reads the cookie, so render it inside Suspense. */
export async function ReaderModeToggle() {
  await connection();
  const on = await isReaderMode();
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <h4 className="font-semibold">Reader mode: {on ? "on" : "off"}</h4>
      <p className="mt-1 mb-3 text-sm text-muted">
        For reading on a phone. Hides Run, Submit, Reset and Mark solved, and shows your saved code read-only. Hints, solutions, lessons and
        notes stay available, and notes stay editable. This is a comfort setting for this browser, not a lock.
      </p>
      <form action={setReaderModeAction}>
        <input type="hidden" name="reader" value={on ? "0" : "1"} />
        <SubmitButton className="rounded-lg border border-line px-4 py-2 font-medium hover:bg-background">
          {on ? "Turn reader mode off" : "Turn reader mode on"}
        </SubmitButton>
      </form>
    </section>
  );
}
