# 0093: Design patterns catalogue in LLD (one lesson per pattern)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)

## Goal

LLD has one overview lesson, `lld-patterns`, that touches about a dozen patterns in a few paragraphs each. Interviews
expect you to name, draw and code any common pattern. Add a **Design patterns** section to the LLD course with **one
lesson per pattern**: all 23 classic patterns plus four that come up in modern interviews. Each lesson covers the
intent, a class diagram, compilable Java code, when to use it and when not to, and how it shows up in LLD rounds.

## Patterns (27 concepts, id = `dp-<name>`)

| Group | Concept ids |
|---|---|
| Creational (agent A) | `dp-factory-method`, `dp-abstract-factory`, `dp-builder`, `dp-prototype`, `dp-singleton`, `dp-object-pool`, `dp-dependency-injection` |
| Structural (agent B) | `dp-adapter`, `dp-bridge`, `dp-composite`, `dp-decorator`, `dp-facade`, `dp-flyweight`, `dp-proxy` |
| Behavioural 1 (agent C) | `dp-chain-of-responsibility`, `dp-command`, `dp-iterator`, `dp-mediator`, `dp-memento`, `dp-observer` |
| Behavioural 2 (agent D) | `dp-state`, `dp-strategy`, `dp-template-method`, `dp-visitor`, `dp-interpreter`, `dp-null-object`, `dp-repository` |

## Step 0 (lead, before the agents start): add the concepts to `study.ts`

In `packages/shared/src/study.ts`, LLD area, add a second section after `lld-topics` (do not change existing ids):

```ts
{
  id: "lld-design-patterns",
  title: "Design patterns",
  weeks: "8-9",
  concepts: [
    c("dp-factory-method", "Factory method", DP_POINTS),
    // ... one c(...) per id in the table above, in table order, titles in sentence case
    //     ("Abstract factory", "Chain of responsibility", "Null object", "Dependency injection", ...)
  ],
},
```

with one shared checklist (the Markdown must use exactly this text):

```ts
const DP_POINTS =
  "Intent and the problem it solves; Structure and participants; A worked example in Java; When to use it and when not to; Related patterns and how it shows up in interviews";
```

Also add one line to `lld-patterns.md` *Overview* pointing to the new section (lead). Then `pnpm content:check` lists the
27 missing lessons; agents fill them in.

## Lesson format (each agent, per concept)

File `packages/shared/content/lld/<id>.md`. Format: `docs/content-editing.md`, section "The Markdown format" (read only
that section). Front matter: `id`, `title` (same as `study.ts`), `area: lld`, `section: Design patterns`.

- `## Overview`: 2-4 sentences: what it is, the one-line intent, what an interviewer wants to hear.
- `## What to know`: the five points, each `N. <point text exactly> :: <explanation, 2-5 sentences>`.
- `## Recap`: 2-3 one-liners.
- `## Go deeper`, sections in this order:
  - `### The problem it solves {point: 0}`: a concrete before/after: code smell or requirement without the pattern.
  - `### Structure {point: 1}`: participants in prose, then one `mermaid` `classDiagram`.
  - `### Example: <a real scenario> {point: 2}`: prose, then one `java` block, complete and compilable (one file, nested
    static classes allowed, a `public class Main` with `main` that prints a short demo). Pick scenarios from LLD rounds
    (payments, notifications, parking lot, documents, UI widgets, file systems, games…), not "Animal/Dog".
  - `### When to use it and when not to {point: 3}`: signals, costs, the simpler alternative.
  - `### In interviews {point: 4}`: how it appears in the LLD problems of this app (name them: parking lot, elevator,
    vending machine, text editor…), related patterns and how it differs from the one it is confused with (Strategy vs
    State, Decorator vs Proxy, Factory method vs Abstract factory, Adapter vs Facade, Builder vs Factory…).
  - `### Modern Java` (no point, optional): records, lambdas, `enum` singletons, `java.util` examples (e.g.
    `Iterator`, `Comparator`, `Collections.unmodifiableList` as proxy).
- `## Interview questions`: 3-5 questions to answer out loud.
- `## Common mistakes`: 3-5 items.

Rules: our own words (no copying from books or sites), plain short sentences, no emoji, no hype. Java 17, no external
libraries. Every Java block must compile and run: save it to a scratch folder outside the repo as `Main.java`, run
`javac Main.java && java Main`, and fix until it does (if `javac` is missing, say so in the notes).

## Steps

- [ ] **0. Lead:** `study.ts` section + `DP_POINTS`, the pointer line in `lld-patterns.md`. Done when `pnpm content:check`
  reports exactly the 27 missing lessons and nothing else.
- [ ] **1-4. Agents A-D in parallel**, each only its own `packages/shared/content/lld/dp-*.md` files from the table.
  Context: read this plan, the "The Markdown format" section of `docs/content-editing.md`, and
  `packages/shared/content/lld/lld-patterns.md` as a style example. Nothing else. Check each file with
  `pnpm content:check` (missing lessons that belong to other agents are expected; your own files must have no errors).
  Do not run `pnpm content:build` (it rewrites the shared generated file; the lead runs it once).
  - Done when: your files pass `content:check`, every Java block compiled and ran, and you listed per file the scenario
    used in *Implementation notes*.
- [ ] **5. Lead:** `pnpm content:build`, `pnpm exec vitest run packages/shared/src/learn`, browser check of
  `/study/lld` (new section listed) and two lessons (diagram and code render, 1280 and 390 px), `pnpm check`, Review.

## Acceptance criteria

- [ ] LLD shows a "Design patterns" section with 27 lessons; `lld-topics` and progress on existing concepts are unchanged.
- [ ] Every lesson has the five points, a class diagram, a compilable Java example with a real scenario, interview
      questions and common mistakes.
- [ ] `learn` tests and `pnpm check` pass.

## Out of scope

Changing the existing LLD problems or the `lld-patterns` lesson body (only the pointer line); quizzes or flashcards for
the new lessons (a later plan can add them to `revise.ts`).

## Implementation notes

(implementer fills in)

## Review

(reviewer fills in)
