---
name: test-cases
description: Write E2E manual test cases for SkyPermit in Markdown from the docs, user-provided requirements, or code exploration. Use when the user asks for test cases, TCs, test scenarios or E2E cases for SkyPermit or one of its modules. Always asks for the source and module before writing, and checks existing cases for duplicates.
---

# E2E Manual Test Cases (SkyPermit)

You are acting as a senior QA engineer. Write cases that someone who has never seen
the app can execute: concrete data, exact UI elements, one action per step.
No filler, no vague data, no invented behaviour.

## Step 0 — Read the module registry

Read `test-cases/README.md` every run. It is the single source of module numbers.
Map the request to an existing module. If none fits, propose a number and name and
add the row only after the user confirms both.

## Step 1 — Ask before reading or writing (mandatory)

Do not read sources or draft anything until the user has answered. Use
`AskUserQuestion` in a single round:

1. **Source** — which material is the test basis?
   - All SkyPermit docs: `/Users/liubovbarzakova/skypermit/ct-gen-ai-skypermit/docs/` (`01`–`08`)
   - Specific doc files only (user names them)
   - Requirements pasted into the chat / a file path in this repo
   - Code exploration
2. **Module** — which registry module, or a new one?
3. **Feature / scope** within the module (e.g. "pilot currency boundaries", "cancel flow").
4. **Coverage depth** — happy path only; happy path + negative; or happy path + negative + boundary.

Skip a question only if the user already answered it in their request.

If the user picks **code exploration**, warn them that code shows what the app *does*,
not what it *should* do. When docs exist, expected results always come from the docs.
Don't add source or basis fields to the cases; list code-derived expected results in
the final report instead (Step 6).

## Step 2 — Gather facts

Read only the chosen source. Apply the precedence rules from this repo's `CLAUDE.md`:
`05-open-questions.md` is canonical status; `07` overrides `06` where it corrects it
(e.g. weight-band rule fails `AIRCRAFT`); docs override code. Never use web access.

**Visible UI text.** The docs give `data-testid`s, not what the user sees. Whatever
the chosen source, read the page components (`app/**/page.tsx`, `components/`) in the
app folder to get the exact labels, button titles, headings, links and messages a
tester sees on screen. Copy them character for character, including case.

If an expected result can't be derived from the source, don't invent one. Mark the
case as described in Step 5 and list the gap for the user.

## Step 3 — Check for duplicates

Read every `.md` file under `test-cases/` (all modules, not just the target one).
A new case duplicates an existing one if it has the same **actor + object + condition
or boundary value**. Before writing anything, show the user a short table:

| Planned case | Closest existing ID | Action |
|---|---|---|
| <title> | <ID or "none"> | new / extend existing / skip |

Do not write without approval. Always ask the user to review the table first.

## Step 4 — IDs and files

- ID format: `E2E-<MM>-<NNN>` — module from the registry (2 digits), TC number
  (3 digits), e.g. `E2E-04-012`.
- Numbering continues from the highest existing number in that module. Never reuse
  or renumber an ID, even if a case was deleted.
- One file per feature area: `test-cases/<MM-module-slug>/<feature-slug>.md`. Append
  to the existing file if the feature already has one.
- Each file starts with `# <Module> — <Feature>`. No source list.
- Never write inside `ct-gen-ai-skypermit/`.

## Step 5 — Write the cases

Use exactly this format:

```markdown
### E2E-04-012 — Verify Operator cannot submit a flight request when the window starts inside zone-local curfew

**Priority:** High | Medium | Low
**Type:** Positive | Negative | Boundary
**Preconditions:**
- Operator `<email>` is logged in (log in at `https://skypermit.vercel.app/login` with `<email>` / `<password>`)
- <other state that must exist before Step 1, with how to create it (UI or API)>

| # | Step | Expected result |
|---|------|-----------------|
| 1 | As Operator `<email>` (logged in), open `https://skypermit.vercel.app/<path>` | <page loads; what is shown> |
| 2 | ... | ... |

**Postconditions:**
- <cleanup, or "None">
```

Writing rules:

- **Keep it simple.** Use only the fields in the template above. Don't add
  `Source`, `Sources`, `Basis`, `Test data` or any other extra fields, and don't add inline source
  markers like *(code)* to steps.
- **Title:** `Verify <actor> <can/cannot> <action> <object> <when/with condition>`.
  Actors are limited to **Operator**, **Reviewer** and **Unauthenticated user**.
- **Step 1 = role + navigation by URL.** It states the actor's role (or that there is
  no session) and opens the exact page URL where the test starts, e.g.
  "As Operator `qa+<timestamp>@example.com` (logged in), open `https://skypermit.vercel.app/operator/pilots`" or
  "As an Unauthenticated user (no session), open `https://skypermit.vercel.app/register`".
  Always write full URLs on the app base `https://skypermit.vercel.app` (also recorded in
  `test-cases/README.md`), never bare paths like `/register`. Getting into that role
  goes in Preconditions: Operator logs in at `https://skypermit.vercel.app/login`; Reviewer has an `X-Reviewer-Id`
  entered in the header UI (reviewers don't log in; see `04-frontend-spec.md`);
  Unauthenticated user has no SkyPermit session cookie. Use only page URLs confirmed
  by the source.
- **Steps:** one action per row, imperative. Name every UI element by the exact text
  the tester sees on screen, with its type: `Type <value> into the "Legal name"
  field`, `Click the "Register" button`, `Click the "Log in" link`. Don't use
  `data-testid`s, code field names (`legal_name`) or invented names. No vague data
  like "enter a valid zone".
  Put the exact values in the steps themselves (zone codes from `seed.sql`, UTC
  timestamps, weights, emails). If a value must be generated per run (e.g.
  `<timestamp>`), define it once in Preconditions.
- **Forms:** when a case uses a form, add a step that checks which fields are marked
  required and which aren't, listing each field by its visible label.
- **Expected result** for every step, observable in the UI (text, state, element
  visible) or in a response. For gate rejections, state `failing_gate`, the exact
  `rule_reference` from `06` §6 (corrected by `07`) and the message.
- **Preconditions / Postconditions:** include only when needed; otherwise write
  "None". Preconditions may use API calls for setup. Postconditions describe cleanup
  only through actions the docs say exist. If the docs give no way to remove the data,
  make the case independent instead (unique data per run, e.g.
  `qa+<timestamp>@example.com`) and say so.
- **Undefined behaviour** (items open in `05`, e.g. `Operator.status = SUSPENDED`,
  zone `active` citation): keep the case but write `Expected result undefined — see
  05-open-questions.md <id>` and assert nothing beyond what is confirmed.

## Coverage rules

- Boundary rules get three cases: at the limit, just inside, just outside — pilot
  18-month currency (`certified_on` → `window_start`), weight bands, lead time,
  advance-booking limit, duration, curfew incl. `A-7` for `KBP-CTR-3` / `ODS-CTR-5`,
  altitude ceiling, cancellation deadline, `flight_purpose` 2,000 chars.
- Later-gate cases must pass every earlier gate. Gate-order cases fail two gates and
  expect the earlier one (PILOT → AIRCRAFT → ZONE → TIME_WINDOW).
- State-transition cases cover legal transitions and illegal ones that should return `409`.
- Schedule-overlap cases: only `APPROVED` and `UNDER_REVIEW` block a booking.
- `RETIRED` aircraft and `INACTIVE` pilots don't affect gates. Test that; don't
  assume a rejection.
- Use real zone data from `supabase/seed.sql`. Never put secrets or keys in cases.

## Step 6 — Self-check, then report

Before finishing, verify:

- [ ] Every case follows the Step 5 format exactly; IDs are unique and sequential.
- [ ] Every expected result traces to the chosen source; nothing invented.
- [ ] Every step has one action, concrete data, and names UI elements by their exact
      on-screen text.
- [ ] Open items from `05` are marked "expected result undefined", not asserted.
- [ ] No secrets, keys, or credentials in any file.

Reply to the user with: the files written, the ID range added, cases skipped or
extended as duplicates (with the existing IDs), expected results taken from code
rather than docs (case ID + what), cases marked "expected result
undefined", and any doc gaps or doc/code conflicts found (as defect candidates,
never as fixes to the app). Do not paste the cases back unless asked.
