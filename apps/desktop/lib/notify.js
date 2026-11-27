// @ts-check

/**
 * Decides whether to show a system notification and triggers it if appropriate (plan 0119 step 4).
 * Pure helper with injected notification class for unit testing.
 *
 * @param {object} input
 * @param {boolean} [input.enabled] user setting for system notifications (default true)
 * @param {string | null | undefined} [input.summary] summary string from summaryLine(notices)
 * @param {number} [input.count] number of update notices
 * @param {any} [input.NotificationClass] Electron Notification constructor or mock
 * @param {() => void} [input.onClick] handler called when user clicks the notification
 * @returns {boolean} true if a notification was displayed
 */
export function maybeShowNotification(input) {
  const { enabled = true, summary, count = 0, NotificationClass, onClick } = input;
  if (!enabled) return false;

  const text = summary && summary.trim().length > 0 ? summary : count > 0 ? `${count} updates in courses you follow` : null;
  if (!text) return false;
  if (!NotificationClass) return false;

  try {
    const notif = new NotificationClass({
      title: "Zen Dojo",
      body: text,
    });

    if (onClick) {
      if (typeof notif.on === "function") {
        notif.on("click", onClick);
      } else {
        notif.onclick = onClick;
      }
    }

    if (typeof notif.show === "function") {
      notif.show();
    }
    return true;
  } catch {
    return false;
  }
}
