"use server";

import { refresh } from "next/cache";
import { isUnitId, setUnitFollow, type FollowState } from "@/lib/content-follow";

// Plan 0119 step 6: the Follow / Mute control per unit in the Offline content card. Each unit has a small form whose
// buttons submit a `state` value, so it works without JavaScript. These are the user's own settings: no admin check.
export async function setUnitFollowAction(formData: FormData): Promise<void> {
  const unit = formData.get("unit");
  const state = formData.get("state");
  if (!isUnitId(unit)) return;
  if (state !== "follow" && state !== "mute" && state !== "default") return;
  await setUnitFollow(unit, state satisfies FollowState);
  refresh();
}
