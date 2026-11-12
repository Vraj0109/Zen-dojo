"use server";

import { getSession } from "@/lib/auth/session";
import { getPublicProfileState, publishPublicProfile, unpublishPublicProfile, publicProfileLink, type PublicProfileState } from "@/lib/public-profile";

export type PublicProfileResult = { ok: true; enabled: boolean; id: string | null; link: string | null } | { ok: false; error: string };

const SIGN_IN = "Sign in to your Zen Dojo account first.";

function withLink(state: PublicProfileState): PublicProfileResult {
  if (!state.ok) return state;
  return { ok: true, enabled: state.enabled, id: state.id, link: state.enabled && state.id ? publicProfileLink(state.id) : null };
}

/** Turns the public profile on (uploads the snapshot) or off (deletes it on the server). */
export async function setPublicProfile(enabled: boolean): Promise<PublicProfileResult> {
  if (!(await getSession())) return { ok: false, error: SIGN_IN };
  return withLink(enabled ? await publishPublicProfile() : await unpublishPublicProfile());
}

/** Re-uploads the current snapshot. Only does anything when the profile is already public. */
export async function refreshPublicProfile(): Promise<PublicProfileResult> {
  if (!(await getSession())) return { ok: false, error: SIGN_IN };
  const state = await getPublicProfileState();
  if (!state.ok || !state.enabled) return withLink(state);
  return withLink(await publishPublicProfile());
}
