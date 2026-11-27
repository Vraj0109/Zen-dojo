# Wave 3 C12: Follow / Mute per course and pattern (plan 0119 step 6)

## Files

- New `apps/web/lib/content-follow.ts`: `getFollowMute(db?)`, `setUnitFollow(unit, state, db?)` where state is
  `follow | mute | default`; pure `applyFollowState`, `parseUnitList`, `isUnitId`. Stored in the user DB `settings`
  table under `content.follow` and `content.mute` (JSON arrays of unit ids). Mute wins over Follow; the two lists stay
  disjoint.
- New `apps/web/lib/content-follow.test.ts`: defaults, round trip (follow, mute, default), other units untouched,
  invalid unit rejected, pure rules, malformed stored JSON.
- New `apps/web/app/profile/settings/follow-actions.ts` (no `actions.ts` exists there): `setUnitFollowAction(formData)`
  reads `unit` and `state` from the form, validates both, calls `setUnitFollow`, then `refresh()`. No admin check.
- `apps/web/app/profile/settings/offline-content.tsx` (desktop variant only): new optional props `units`, `follow`,
  `mute`. A "Follow or mute" list renders one row per unit; each row is a `<form>` with a hidden `unit` input and three
  submit buttons (Default, Follow, Mute, each with `name="state"`), so it works without JavaScript. The active button has
  `aria-pressed`. Plain text only, no symbols.
- `apps/web/lib/content-sync/desktop-notices.ts`: `desktopNotices` takes a fifth optional argument
  `prefs: { follow, mute }` (default empty) and passes it to `followedUnitsDesktop`.
- `apps/web/app/api/content/sync/route.ts`: reads `getFollowMute(userDb)` and passes it into `desktopNotices`.
- `apps/web/lib/content-sync/desktop-notices.test.ts`: two new cases: a muted started unit gives no notice; a followed
  unit that was never started gives a notice.

## Test commands and results

- `pnpm exec vitest run apps/web/lib/content-follow.test.ts apps/web/lib/content-sync apps/web/app/no-emoji.test.ts`:
  7 files, 54 tests passed.
- `cd apps/web && npx tsc --noEmit`: no errors.
- `pnpm lint`: exit 0.
- Not run: the app in a browser (desktop mode needs the local content copy). The settings UI has not been seen rendered.

## Deviations

1. **Units come in as props, not from `/api/content/units` in the browser.** A list built by client-side fetch does not
   render without JavaScript, and the plan requires the forms to work without it. The list is therefore rendered by the
   server. This needs the wiring below.
2. **Two follow/mute stores exist.** `apps/web/app/profile/settings/offline-actions.ts` (not my file) already has
   `setUnitFollowPreferenceAction` and `getDesktopContentSettings().followUnits/muteUnits`, which use the keys
   `content_follow_units` and `content_mute_units`. Nothing in the UI called them. The new store (`content.follow`,
   `content.mute`) is the one the sync route reads. The old code should be removed (see questions).
3. Styling uses the same Tailwind classes as the rest of the card, not the helpers in `app/ui.tsx`.

## Wiring needed outside my files (lead)

In `apps/web/app/profile/settings/page.tsx`, `OfflineContentSection` (desktop branch) should pass the new props:

```tsx
const [follow, units] = await Promise.all([getFollowMute(), listUnits(await getContentDb())]);
return <OfflineContentCard isDesktop {...desktopData} units={units} follow={follow.follow} mute={follow.mute} />;
```

Imports: `getFollowMute` from `@/lib/content-follow`, `listUnits` from `@/lib/content-sync/serve`, `getContentDb` from
`@/lib/content-db/client`. Until this is done the desktop card shows no follow list (the `units` prop is optional).

## Questions

1. Delete `setUnitFollowPreferenceAction` and the `followUnits`/`muteUnits` reads from `offline-actions.ts`, or keep them?
   I did not touch that file.
2. Should `content.follow` and `content.mute` be added to `SYNC_SETTINGS_DENYLIST` in `apps/web/lib/sync-triggers.ts`?
   Right now they sync to other devices like other settings. The old keys `content_follow_units` and
   `content_mute_units` are not denylisted either.
3. Is `listUnits` (from `lib/content-sync/serve.ts`) fine to call from the settings page on desktop? It reads the local
   content copy only.
