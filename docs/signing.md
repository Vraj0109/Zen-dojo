# Signing the installers

Today the installers are **not signed**. Windows SmartScreen and macOS Gatekeeper warn once on first install; the
steps to get past them are in every release's notes and in the README (`docs/releases/_install-notes.md`). This page
lists the ways to remove the warning, what each costs and what you would do. Nothing here is set up yet.

Prices and eligibility change. Check each provider's current terms before you rely on this table (last written 2026-11-11, not re-checked against the providers).

| Route | Cost | Notes |
|---|---|---|
| Do nothing, document the warning | free | Users click *More info*, *Run anyway*. This is the current state. |
| SignPath Foundation | free for open-source projects after approval | Signs through GitHub Actions. The publisher shown is the foundation's. Needs an open-source licence and an application. |
| Microsoft Artifact Signing (Azure, formerly Trusted Signing) | about $10 a month | electron-builder supports it through `win.azureSignOptions`. Identity validation and region eligibility apply. |
| OV or EV code-signing certificate | roughly $200 to $500 a year | Identity checks, hardware or cloud key. Reputation still builds with downloads. |
| Apple Developer ID and notarization (macOS) | $99 a year | The only way to remove the Gatekeeper warning. |

## SmartScreen reputation

Even a correctly signed installer from a new publisher can still show SmartScreen warnings until enough people have
installed it. Signing makes the publisher name show and builds reputation over time; it is not an instant fix.

## What you do for each route

Never paste certificates, passwords or tokens into chat, issues or the repo. Add them yourself in GitHub under
*Settings, Secrets and variables, Actions*.

- **SignPath:** apply at signpath.org for the open-source programme, then create the project and a CI user token.
  Planned secret names: `SIGNPATH_API_TOKEN`, plus the organisation id, project slug and signing policy slug as
  repository variables (`SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG`). The
  workflow uploads the unsigned installer, submits it with SignPath's GitHub Action (read its current docs for the
  version and inputs) and publishes the signed file.
- **Azure Artifact Signing:** create the account, complete identity validation and a certificate profile. Planned
  secret names: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`. The publisher name, endpoint, account
  name and profile name go into `win.azureSignOptions` in `apps/desktop/electron-builder.yml`.
- **OV/EV certificate:** planned secret names `CSC_LINK` (the certificate, base64) and `CSC_KEY_PASSWORD`. A hardware
  or cloud-held key usually needs the provider's own signing tool instead.
- **macOS Developer ID:** planned secret names `CSC_LINK` (Developer ID certificate, base64), `CSC_KEY_PASSWORD`,
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Then set `mac.identity` to the Developer ID,
  `hardenedRuntime: true` and `notarize: true`, and **test that the SQLite native module still loads**: the current
  ad-hoc setup turns the hardened runtime off for exactly that reason.

The workflow must skip signing cleanly when the secrets are absent, so unsigned builds keep working. Sign before
`latest.yml` is produced: it holds the installer's hash, and auto-update checks it. Never reuse or move a published
tag; test with a new pre-release tag such as `v0.7.2-rc1`.

## Open points

- **Intel Macs:** the macOS build is Apple Silicon (arm64) only. An Intel build is a separate decision.
- **macOS first run without a Developer ID:** on macOS 15 (Sequoia) and newer, right-click then *Open* no longer works: use System Settings,
  Privacy & Security, *Open Anyway* (or on any version run `xattr -dr com.apple.quarantine "/Applications/Zen Dojo.app"`).
- **Windows Smart App Control** can also block unsigned programs the judge compiles. See `docs/troubleshooting.md`.
