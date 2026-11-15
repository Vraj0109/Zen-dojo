# Zen Dojo courses

Extra courses for [Zen Dojo](https://github.com/Vraj0109/Zen-dojo). The app's Learn page lists them under
**Course library**; one click downloads a course, and it then works offline.

DSA, System design, LLD and Core CS are built into the app and are not here.

## Layout

```
catalog.json         the list the app reads (generated, do not edit by hand)
courses/<id>.json    one content pack per course
.github/workflows/check.yml
```

Each course is a content pack (format `zendojo-pack`, version 2) with:

- no `target` (a library course is a course of its own),
- a `revision` such as `"1.0.0"`,
- an optional `category` such as `"Languages"`, `"Data"` or `"Tools"` (otherwise it is listed under "Other"),
- a file name equal to its `id`.

The format is described in the app repo: `docs/content-packs.md`. Limits: 2 MB and 500 items per pack.

## Add or change a course

1. Edit or add `courses/<id>.json` and bump its `revision` (the app shows **Update** when the revision is newer).
2. From a checkout of the app repo, check it: `pnpm pack:check <path>/courses/<id>.json`.
3. Rebuild the catalog: `pnpm courses:catalog <path to this repo>`.
4. Commit both the course and `catalog.json`.

CI runs the same command and fails if a pack is invalid or `catalog.json` is stale.

## Licence

(To be chosen by the owner, for example CC BY 4.0 for the text and MIT for code samples.)
