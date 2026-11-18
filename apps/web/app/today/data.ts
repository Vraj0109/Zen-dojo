import "server-only";
import { cache } from "react";
import { toLocalDate } from "@habit/shared";
import { getWeekFocus } from "@/lib/focus";
import { getProgress } from "@/lib/progress";
import { getTodayView } from "@/lib/tasks";
import { getReviewQueue, splitReviewQueue } from "@/lib/review";

// Reads shared by the sidebar, the phone header and Today. `cache` runs each one once per request, so the review
// queue (the slowest read) is not built twice when the layout and the page both need it.

/** Streak, XP and level (read-only; does not create today's tasks). */
export const progressNow = cache(() => getProgress(toLocalDate()));

/** Today's capped review list and the overflow backlog. */
export const reviewSplit = cache(async () => splitReviewQueue(await getReviewQueue()));

/** Today's plan view (creates today's tasks on first read, as before). Used only by the Today page. */
export const todayView = cache(getTodayView);

/** One week's focus (patterns, concepts, designs). */
export const weekFocus = cache(getWeekFocus);
