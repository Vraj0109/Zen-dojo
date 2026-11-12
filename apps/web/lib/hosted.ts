/** True when this server is the hosted website (plan 0058) rather than a person's own machine or the desktop app. */
export function isHosted(): boolean {
  return process.env.HABIT_HOSTED === "1";
}
