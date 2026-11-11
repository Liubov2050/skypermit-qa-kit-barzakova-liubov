---
name: cover-gaps
description: Find SkyPermit business rules that no test case covers yet, then cover them by writing the missing test cases. Runs coverage/find-gaps.mjs (reads the docs live), lets the user pick modules, delegates writing to the test-cases skill and checking to the test-case-verifier subagent. Use when the user asks what is not covered, for coverage gaps, missing test cases, or to cover the remaining business rules.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write(test-cases/**)
argument-hint: "[module number, e.g. 03] [max rules, e.g. 10]"
---

# Cover gaps (SkyPermit)

Finds rules from `ct-gen-ai-skypermit/docs/` that no case in `test-cases/` covers, and closes the gaps.
You do not decide what a rule is or whether it is covered; the script does. You do not write cases
yourself; the `test-cases` skill does. You do not check them; `test-case-verifier` does.

## Step 1 — Find the gaps

Run from the repo root:

```
node coverage/find-gaps.mjs --json
```

It reads the docs and `test-cases/**` live and writes nothing. No rules file exists to maintain.
Statuses per rule: `covered`, `partial` (boundary rule with fewer than the required at / just inside /
just outside cases), `missing`, `open` (docs leave the expected result undefined, see `05`).
Rule ID prefixes: `BR-` business rule table (`06`), `ST-` state transition (`02`), `EP-` endpoint (`03`),
`ERR-` status code (`03`), `UQ-` unique field (`01`), `DV-` derived value (`01`), `OQ-` open question (`05`),
`PR-` prose rule. Read `notes` in the output: it lists rules skipped because the docs text changed.

If the script fails or prints notes about missing doc text, tell the user and stop. Don't work around it.

## Step 2 — Show the result, then ask

Show a short table per module: rules, covered, partial, missing, open. Then ask in one
`AskUserQuestion` round (skip what the user already said):

1. **Which modules** to cover (from `modules` in the JSON; offer the modules that have gaps).
   If the user passed a module number as the first argument (`/cover-gaps 03`), use it and skip this question.
   If a second argument is a number (`/cover-gaps 03 10`), it is the **maximum number of rules** to cover in
   this run: take the first N rules with status `missing` or `partial` in the script's order (`open` rules
   don't count toward N), list them to the user, and leave the rest for a later run. With no second
   argument, cover all gaps in the chosen module. If an argument isn't a module number from the registry
   or a positive integer, say so and ask instead of guessing.
2. **Depth** — happy path + negative, or + boundary (boundary rules need three cases each).

Never cover everything in one go. Work module by module.

## Step 3 — Second read for what the script cannot see

The script finds table rows and a fixed set of prose rules. Before writing, read the chosen module's
relevant docs once and list any testable rule it did not report (a prose sentence with a threshold,
status code or condition). Show these to the user as "extra rules found by reading" and include them
only if the user agrees. Also treat `EP-` rules with caution: the script only counts an endpoint as
covered when a case names its `/api/v1/...` path, so an endpoint exercised through the UI can show
`missing`. Say which ones look like that and ask whether to skip them.

## Step 4 — Write the cases

Invoke the `test-cases` skill for each chosen module. Give it:
- the source: the SkyPermit docs `01`–`08`;
- the module (registry number) and the exact list of rule IDs and titles from the script;
- the depth chosen in Step 2.

Let it run its own steps unchanged: it asks its questions (answer them from what the user already
chose), builds the duplicate table and waits for approval before writing. Do not bypass that approval.
Rules with status `open` get a case marked "Expected result undefined — see 05-open-questions.md";
never assert anything for them.

## Step 5 — Verify

Spawn the `test-case-verifier` subagent on the new files. Pass the file paths, not the case text.
If it reports `Needs fixes`, fix the cases (through the `test-cases` rules) and run it again.
Do not edit expected results to match the code; docs win. Report app mismatches as defect candidates.

## Step 6 — Re-check and report

Run `node coverage/find-gaps.mjs --module <MM>` again. Report to the user:
- before / after counts for the module (covered, partial, missing, open);
- files written and the ID range;
- rules still `partial` or `missing`, and why (for example not testable at rest, or matching limit);
- verifier findings left unresolved, doc gaps, and defect candidates.

Leave committing to the `ship` skill; don't commit yourself.

## Limits

- Never write inside `ct-gen-ai-skypermit/`. No web access.
- Don't edit `coverage/find-gaps.mjs`, the `test-cases` skill, the verifier or `test-cases/README.md`
  during a run. If the script mis-detects coverage, tell the user and suggest the fix.
- The script matches on text (rule reference, gate, states, zone codes, numbers, case `Type`).
  A case that covers a rule in other words may show as `missing`; the user decides, not you.
