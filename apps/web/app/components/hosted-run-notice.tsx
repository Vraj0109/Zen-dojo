/** Plan 0058: the single notice shown when the hosted site refuses to run code. */
export const HOSTED_NO_RUN_MESSAGE = "Running code is available in the desktop app.";
export const DESKTOP_DOWNLOAD_URL = "https://github.com/Vraj0109/habit-manager/releases/latest";

/** Renders `text`; when it is the hosted no-run error code or message, adds the download link. */
export function FailureText({ text }: { text: string }) {
  if (text !== "hosted-no-run" && text !== HOSTED_NO_RUN_MESSAGE) return <>{text}</>;
  return (
    <>
      {HOSTED_NO_RUN_MESSAGE}{" "}
      <a href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="underline">
        Download it
      </a>
      . You can keep editing and saving here.
    </>
  );
}

/** Hosted site only: LLD Java projects cannot run here (no JDK on the server), so show this instead of Run Project. */
export function HostedProjectNotice() {
  return (
    <p role="note" className="rounded-lg border border-line bg-background px-3 py-2 text-sm text-muted">
      LLD Java projects need the desktop app to run. You can still read the problem, hints and reference here.{" "}
      <a href={DESKTOP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
        Download the desktop app
      </a>
      .
    </p>
  );
}
