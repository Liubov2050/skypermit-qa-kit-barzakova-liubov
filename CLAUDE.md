# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This repo (`skypermit-qa-kit`) is a **QA workspace** for testing the SkyPermit app.
The person working here is a QA engineer. Typical requests:

- design and write manual test cases
- write test plans and checklists
- write automated tests (API and UI) against the running app

All of this work is **derived from the SkyPermit documentation**. The docs are the
test basis and the source of expected results. The app's code is the system under
test, not a spec.

## Project structure

```
skypermit/
├── skypermit-qa-kit-barzakova-liubov/   ← this repo: all QA output goes here
│   ├── .claude/settings.json
│   ├── CLAUDE.md
│   └── README.md
└── ct-gen-ai-skypermit/                 ← the SkyPermit app (system under test), READ-ONLY
    ├── docs/                            ← test basis (see below)
    ├── app/, lib/, components/, supabase/, public/openapi.yaml
    └── tests/                           ← the developers' unit/route tests (Vitest), not ours
```

The app is a **sibling folder**, not inside this repo:
`/Users/liubovbarzakova/skypermit/ct-gen-ai-skypermit` (relative to this repo:
`../ct-gen-ai-skypermit/`). In this file, `ct-gen-ai-skypermit/...` means that
folder, and app paths without a prefix (`app/`, `lib/`, `supabase/`) are relative
to its root.

It is a separate git repo (origin `github.com/IraVol/ct-gen-ai-skypermit`) and is
not tracked by this repo in any way (no submodule, no gitlink). A fresh clone of
this repo does not include it; clone the app next to it.

The app folder is listed in `additionalDirectories` in `.claude/settings.json`, so
its files can be read without permission prompts. Its own `CLAUDE.md` still isn't
loaded automatically. Read docs by their absolute path.

QA artifacts are not organised yet. Unless the user says otherwise, put them at the
root of this repo, one folder per artifact type (for example `test-plans/`,
`test-cases/`, `checklists/`, `automation/`). No automation framework has been
chosen or set up yet. Confirm the tooling with the user before scaffolding it.

## Permissions and limitations

**`ct-gen-ai-skypermit/` is read-only.** You may read anything in it. Never create,
edit, delete, rename or format files there, and never commit, branch, stash or
reset inside it. That includes "small fixes" for bugs found while testing. Report
a defect; don't patch it.

This is enforced in `.claude/settings.json`, which denies `Edit` (this also covers
Write and other file-editing tools) on
`//Users/liubovbarzakova/skypermit/ct-gen-ai-skypermit/**`, plus
`/ct-gen-ai-skypermit/**` in case the app is moved back inside this repo. If the
app folder moves, update that path. The deny doesn't cover shell commands, so never use
Bash (`sed -i`, redirects, `mv`, `rm`, `git checkout`, etc.) to change the folder
either.

**No web access.** Don't use WebSearch or WebFetch (both are denied in
`.claude/settings.json`). All information comes from the files in this repo and
the app folder, the docs in particular. If something isn't covered there, ask the user.

Commands that write into the app folder count as modifying it, even when they
don't touch source. Ask the user before running any of these:

- `npm install` (creates `node_modules/`)
- `npm run dev` or `npm run build` (create `.next/`; `next dev` also rewrites `AGENTS.md`)
- `npx supabase ...` or anything that applies migrations or seeds data

Other limits that matter for testing:

- The app can't run against real data yet. `.env.local` doesn't exist and must
  hold Supabase keys (see `ct-gen-ai-skypermit/supabase/SETUP.md`). Ask the user for
  the base URL of a running instance instead of trying to start one.
- Never put Supabase keys or other secrets in test code or committed files. Read
  them from environment variables.
- Write automated tests in this repo. Never add them to `ct-gen-ai-skypermit/tests/`.

The app's own `CLAUDE.md` and `AGENTS.md` are written for developers building the
app. Its implementation priorities and coding instructions don't apply here.
Its domain facts do apply.

## Test basis: the docs

All in `ct-gen-ai-skypermit/docs/`:

| Doc | What it gives QA |
|---|---|
| `01-data-model.md` | Seven entities, fields, enums, constraints, derived (never stored) values, UTC time handling |
| `02-state-machine.md` | Seven flight-request states and the legal transitions. Every transition not shown should return `409` |
| `03-api-contract.md` | Endpoints, methods, status codes, auth (operator session cookie and reviewer `X-Reviewer-Id` header), the `422` body shape, gate pipeline order |
| `04-frontend-spec.md` | Operator portal, reviewer queue, and the `data-testid` contract (use these as UI selectors) |
| `05-open-questions.md` | **Canonical status** of open and resolved questions |
| `06-business-rules.md` | Gate logic, thresholds, zone catalogue, cancellation deadline, `rule_reference` values |
| `07-clarifications.md` | Why each question was resolved the way it was, plus a confirmed correction to `06` |
| `08-uml-diagrams.md` | ER diagram, state diagram, gate-pipeline sequence |

`public/openapi.yaml` (served at `/swagger` and `/api-docs`) is a secondary
reference. If it disagrees with `03-api-contract.md`, that's a finding.

### When docs disagree

1. `05-open-questions.md` is the current status of any question. It overrides the
   open-questions list in `06` §7 and the wording in `07`.
2. `07-clarifications.md` overrides `06-business-rules.md` where it corrects it.
   Known case: the aircraft weight-band rule fails the **`AIRCRAFT`** gate, even
   though the cited source text (`ZC-2026.1 §2`) says "fails the zone gate".
3. Docs override code. If the app behaves differently from the docs, that's a
   defect candidate, not a reason to change the expected result.

If a case still can't be resolved, flag it to the user rather than picking an
expected result. Never invent behaviour for something the docs leave open.

### Domain facts testers need often

- Gates run in a fixed order, **PILOT → AIRCRAFT → ZONE → TIME_WINDOW**, and stop at
  the first failure. Both `submit` and `validate` use the same pipeline. To test a
  later gate, the input must pass every earlier one. To check ordering, make the
  input fail two gates and assert that the earlier gate is reported.
- Every `422` body has `failing_gate`, `rule_reference` and `message`. Assert the
  exact `rule_reference` from `06` §6.
- Boundary-heavy rules to test at, just inside and just outside the limit: pilot
  18-month currency (measured from `certified_on` to `window_start`), weight-band
  thresholds, lead time, advance-booking limit, duration bounds, zone-local curfew
  including the `A-7` override for `KBP-CTR-3` / `ODS-CTR-5`, altitude ceiling, and
  the cancellation deadline.
- The aircraft schedule overlap check considers only `APPROVED` and `UNDER_REVIEW`
  requests. `DRAFT`, `REJECTED`, `CANCELLED` and `COMPLETED` don't block a booking.
- `window_start` / `window_end` are UTC. Curfew is evaluated in zone-local time.
- Pilot currency and aircraft weight band are computed when read and returned by
  `GET` endpoints. They are never stored.
- `flight_purpose` is capped at 2,000 characters.
- `COMPLETED` is set only by the dedicated maintenance-completion endpoint, never
  because time passed.
- Known open items (see `05`). Test cases for these should be marked "expected
  result undefined" and not asserted:
  - `Operator.status = SUSPENDED`: its status code and response shape are undefined.
  - Zone `active`: the rule is confirmed, but its `rule_reference` citation isn't.
- `Aircraft.status = RETIRED` and `Pilot.status = INACTIVE` are confirmed **not** to
  affect gates.
- Zone data is read-only reference data from `supabase/seed.sql`. Use it for real
  zone codes, classes, ceilings and permitted bands in test data.

## Useful app internals (read-only, for test design)

- Endpoints are in `app/api/v1/**/route.ts`. Response helpers are in `lib/http.ts`.
- Transitions are in `lib/state-machine.ts`. Gates are in `lib/gates/` (one file per
  gate, plus `pipeline.ts`). Derived values are in `lib/derived.ts` and
  `lib/curfew.ts`.
- `app/api/items/route.ts` is leftover scaffold that queries a table no migration
  creates. It's out of scope.
- The developers' existing Vitest coverage (`ct-gen-ai-skypermit/tests/`) is useful
  for spotting gaps, but don't treat it as the expected behaviour.
