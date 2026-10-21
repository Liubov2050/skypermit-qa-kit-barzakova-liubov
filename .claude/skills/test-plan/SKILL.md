---
name: test-plan
description: Write a concise, one-page Test Plan for the SkyPermit project from existing docs or user-provided requirements. Use when the user asks for a test plan, QA plan, or test strategy document for SkyPermit or one of its features. Always asks which data source to use before writing anything.
---

# One-page Test Plan (SkyPermit)

You are acting as an experienced QA Lead. Produce a professional, objective,
strictly concise Test Plan that fits on **one page** (target 400–550 words).
Bullets over prose. No filler, no marketing tone.

## Step 1 — Ask for the data source (mandatory, before any reading or writing)

Do not read docs or draft anything until the user has answered. Use
`AskUserQuestion` in a single round:

1. **Data source** — which material is the test basis?
   - SkyPermit docs folder: `/Users/liubovbarzakova/skypermit/ct-gen-ai-skypermit/docs/` (all of `01`–`08`)
   - Specific doc files only (user names them)
   - Requirements pasted into the chat / a file path in this repo
   - Other (ticket text, spec link content pasted by the user)
2. **Plan scope** — whole product, or a specific feature / release (e.g. gate pipeline, operator auth, reviewer queue)?
3. **Schedule inputs** — start date, release/end date, or "leave dates as TBD". Never invent dates.
4. **Environment & tools** — base URL / environment name and tracker/tooling, or "derive from docs, mark gaps TBD".

Skip a question only if the user already answered it in their request.

## Step 2 — Extract facts from the chosen source

Read only the chosen source. Collect:

- **Features to test** — group into 4–7 functional areas. Do not list every rule.
- **Target platforms** — only what the source states (e.g. REST API `/api/v1`, web UI for operator portal and reviewer queue). If the source doesn't state a platform/browser, write "TBD — not specified in source".
- **Testing types** that the source actually justifies (functional, API contract, state-transition, boundary, UI via `data-testid`, regression, auth/authorisation).
- **Open questions / undefined behaviour** — these feed Risks.

When using the SkyPermit docs, apply the precedence rules from this repo's `CLAUDE.md`:
`05-open-questions.md` is canonical status; `07` overrides `06` where it corrects it;
docs override code. The app code is the system under test, never the spec. Items that
`05` lists as open go into Risks as "expected result undefined", never as asserted scope.

If something the plan needs is missing from the source, write **TBD** and list it in
your reply to the user. Do not fill gaps with assumptions or web lookups.

## Step 3 — Write the plan

Save to `test-plans/test-plan-<scope-slug>.md` at the root of this repo (create the
folder if missing). Never write inside `ct-gen-ai-skypermit/`. Use exactly this structure
and these length limits:

```markdown
# Test Plan — SkyPermit <scope>

**Version:** 1.0 · **Date:** <YYYY-MM-DD> · **Author:** <QA Lead / user name> · **Source:** <docs/files used>

## 1. Introduction & Objective
<Exactly 2 sentences: what is tested, and the main goal.>

## 2. Scope
**In Scope**
- <feature area> — <short qualifier>          (4–7 bullets: features)
- Platforms: <from source or TBD>
- Test types: <comma-separated list>

**Out of Scope**
- <item> — <reason in ≤6 words>                (3–5 bullets)

## 3. Test Strategy & Environment
- **Approach:** <risk-based / doc-driven, 1 line>
- **Techniques:** <e.g. boundary values, state-transition, gate-order negative tests>
- **Tools:** <tracker, API client, automation framework or "TBD">
- **Environments:** <name + base URL or TBD>
- **Test data:** <source of data, e.g. zone seed data; secrets via env vars only>

## 4. Entry & Exit Criteria
**Entry**
- <3–4 bullets>

**Exit**
- <3–4 measurable bullets, e.g. 100% planned cases executed, 0 open Critical/High>

## 5. Schedule & Deliverables
| Milestone | Date | Deliverable |
|---|---|---|
| Test planning | <date/TBD> | This test plan |
| Test design | <date/TBD> | Test cases, checklists |
| Execution | <date/TBD> | Execution log, bug reports |
| Closure | <date/TBD> | Test summary report |

## 6. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| <top risk> | <action> |
                                                 (exactly 2–3 rows)
```

Writing rules:

- Every bullet ≤ ~15 words. No paragraphs beyond the 2-sentence objective.
- Name concrete SkyPermit items where the source gives them (gate order
  PILOT → AIRCRAFT → ZONE → TIME_WINDOW, `409` on illegal transitions, `422` body
  shape, `data-testid` contract), but keep it at plan level, not test-case level.
- Prefer risks that are real for this project: undefined behaviour from `05`,
  doc/OpenAPI mismatches, no running environment or `.env.local`, time-zone / curfew
  boundary complexity, test data dependency on seed data.
- Out of Scope must be grounded: things the source excludes or that this QA kit
  cannot do (e.g. performance/load, modifying the app, developer unit tests,
  leftover `app/api/items` scaffold).

## Step 4 — Self-check, then report

Before finishing, verify:

- [ ] All 6 sections present, in order, nothing extra.
- [ ] ≤ ~550 words; would print on one page.
- [ ] Features and platforms trace to the chosen source; nothing invented.
- [ ] No dates invented; gaps marked TBD.
- [ ] No secrets, keys, or credentials in the file.

Reply to the user with: the file path, the source used, and a short list of TBDs
or open points they need to fill in. Do not paste the whole plan back unless asked.
