# Wave 1, agent C3: pure sync and notice logic

## Files (all new, in packages/shared/src/content-model/)

- `units.ts`: `unitsFor(entity)`, `unitsForChange(before, after)`.
- `parts.ts`: `diffParts`, `extractParts`, `patchEntity`, `mergeChanges`.
- `snapshot.ts`: `validateSnapshotChunk(json)`, `chunkPlan(entities, maxBytes)`, type `SnapshotChunk`, `SnapshotCheck`.
- `notices.ts`: `noticesFrom(entries, followed, titles, at = 0)`, `summaryLine(notices)`, `followedUnitsDesktop({ startedUnits, follow, mute })`.
- `tags.ts`: `TAG`, `tagsFor(entity, id, extra?)`.
- Tests: `units.test.ts`, `parts.test.ts`, `snapshot.test.ts`, `notices.test.ts`, `tags.test.ts`.

No other file was edited. `types.ts`, `rev.ts`, `index.ts` and plan files are untouched.

## Test and type check

- `pnpm exec vitest run packages/shared/src/content-model/units.test.ts packages/shared/src/content-model/parts.test.ts packages/shared/src/content-model/snapshot.test.ts packages/shared/src/content-model/notices.test.ts packages/shared/src/content-model/tags.test.ts`
  Result: 5 files, 62 tests, all passed (about 0.3 s).
- `cd packages/shared && npx tsc --noEmit`: exit 0, no errors.
- Not run: `pnpm test`, `pnpm check`, `pnpm build` (as instructed).

The patch guarantee `revOf(patchEntity(before, diffParts(before, after), extractParts(after, parts))) === revOf(after)`
is tested on a hand-built problem (two pages, three sections, code and image blocks) for: one hint, one case, title,
added block, moved block, section title, moved section (within a slot and across pages), new image asset, reused asset,
several changes at once. It is also tested on a lesson, a course, a doc, and a lesson moved between courses. The test
also checks canonical JSON equality, which is stronger than the rev check.

## Deviations from the plan and why

1. **Section data carries its page.** `section:<id>` data is `{ page, section }` (not the bare SectionRow). A new section
   needs to know whether it is in `statement` or `solution`, and the SectionRow has no page field. A deleted section is
   `{ deleted: true }`.
2. **`section-order:<slot>` data is the layout of the whole entity,** not just that slot's id list. It is
   `Record<pageName, { template, sections: [{ id, slot, ord }] }>`. Reasons: when a slot is emptied, the slot can no
   longer tell which page it belonged to; and the section's `ord` is stored per section, so the full order (with
   ords) is needed to rebuild the page exactly. The part key still names the slot that changed, so `diffParts` emits
   one `section-order:<slot>` per slot of each page whose layout changed. A page-level template change with no slots
   gives `all`.
3. **`ord` and `slot` are not part of a section's content.** A move (order change) therefore gives section-order only,
   as plan 0115 requires. Block `ord` is part of the content, so moving a block inside a section gives `section:<id>`.
4. **`asset:<id>` data is `null`.** The entity holds only `assetId`; the image bytes come from the assets list, which
   the server attaches. `patchEntity` ignores asset parts.
5. **`mergeChanges` "all" rule.** If an upsert with `all` comes after the last delete, it becomes the base. Later
   changes are applied to it in order, so the result is one full entity under `all` (rev checked by the test). If the
   group has a delete and then only partial changes, `all` is dropped and the parts are unioned. The client's rev check
   then refetches the entity. Without a base, data is the latest value per part, and section-order data is always the
   latest layout (the layout is whole-entity, so mixing versions would be wrong).
6. **`noticesFrom` has an optional 4th argument `at`** (default 0), because `ChangeEntry` has no time and `Notice.at`
   needs one. Passing the time in keeps the function pure.
7. **`noticesFrom` sorts newest first** (by change version). The 0119 plan does not say an order.
8. **`summaryLine` wording.** One notice: `1 update: <unitTitle>: <note>`, or `1 update: <unitTitle>: <title> was updated`
   when the note is empty. Several: `N updates in courses you follow`. None: `No new updates`.
9. **`tagsFor` throws** when a lesson has no `courseId` or a doc has no `kind`. A silent missing tag would leave stale
   content. A lesson that moves between courses needs `tagsFor` called once per course.
10. **`chunkPlan` measures entities only.** A group's size is the canonical JSON array of its entities. The caller adds
    the wrapper and assets. An entity bigger than `maxBytes` gets a group of its own (it cannot be split).
11. **`validateSnapshotChunk` checks shape only** (types, enums, required fields, paths in errors). It does not check
    that ids are unique or that revs match.

## Fields types.ts lacks (worked around locally)

- `ChangeEntry` has no time (`at`). Handled by the `noticesFrom` argument above.
- `SectionRow` has no page. Handled by the `{ page, section }` payload (internal `SectionPayload` type in parts.ts).
- The `deleted` marker for section parts has no type. Handled by `{ deleted: true }` (internal).
- The unit title for a notice: `titles(entity, id)` gives the entity's unit title, but a lesson moved between courses
  may notify under the other course's unit. See question 2.

## Assumptions

- Section ids are unique within one entity (across both pages of a problem). `locate` keeps the first one if not.
- Asset ids are unique.
- Lessons and problems have pages named `page` and `statement`/`solution`. These names are internal to parts.ts.

## Questions for the lead

1. Is the wrapper for `section:<id>` (`{ page, section }`) and the whole-entity layout for `section-order:<slot>`
   acceptable, instead of a bare SectionRow and the slot's id list in 0115 step 3? The alternative is to add a
   `page` field to SectionRow in types.ts (a contract change).
2. For notices, should `titles` take the unit as well, `(unit, entity, id)`, so `unitTitle` is right for a moved
   lesson? The current signature follows the brief.
3. Should `ChangeEntry` get an `at` (time) field so `noticesFrom` does not need the extra argument?
4. Wording of `summaryLine` for one notice: is `1 update: <unitTitle>: <note>` right, or should it read like the 0119
   example ("Caching: new diagram in ...")?

## Found but not changed

- Nothing outside C3's files was touched. No problems were found in other files during the type check (exit 0).
