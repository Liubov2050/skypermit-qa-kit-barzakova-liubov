---
name: ship
description: Stage all changes, commit to main with a short goal-focused message, and push after the user confirms. Use when the user asks to commit, commit and push, save changes to git, or push the latest update in this QA repo.
---

# Git routine: add → commit → (confirm) → push

Works only in this repo (`skypermit-qa-kit`), directly on `main`. Never run git
commands inside `../ct-gen-ai-skypermit/` (read-only).

## Step 1 — Inspect

Run in parallel from the repo root:

- `git status --short`
- `git diff HEAD --stat` and `git diff HEAD` (for untracked files, read them or rely on `git status`)
- `git branch --show-current`
- `git log -5 --oneline` (to match the message style)

Stop and tell the user if:

- there is nothing to commit (clean tree);
- the current branch is not `main` (ask how to proceed; do not create branches or switch silently);
- changed files look like secrets (`.env*`, keys, tokens, credentials). Exclude them and say so.

## Step 2 — Stage

`git add -A`, minus anything excluded in Step 1. Then check `git status --short`
to confirm what is staged.

## Step 3 — Write the commit message

One line, imperative or noun-phrase, max ~80 characters, no trailing period. It
always starts with the prefix `ws2: ` and then states the **main goal of the
update**, not a list of files. Examples:

- `ws2: Instruction to use full URLs instead of relative paths in QA artifacts`
- `ws2: test-plan skill update to include build version`
- `ws2: Add operator registration test cases`

If the changes cover several unrelated goals, pick the main one; mention the rest
in the summary and offer to split into separate commits.

End the message body with the attribution line given in the session's
system-reminder (e.g. `Co-Authored-By: ...`), after a blank line.

## Step 4 — Commit

Commit with a heredoc so formatting is preserved. Do not use `--no-verify` or
`--amend`. If a hook fails, report the output and stop; don't work around it.

## Step 5 — Show summary and ask before push (mandatory, every time)

Show the user:

- **Commit:** short hash + message
- **Branch:** `main` → `origin/main`
- **Files:** list with status (added / modified / deleted), from `git show --stat --format= HEAD`
- **Goal:** one sentence on what the update does

The question dialog can hide text written before it, so the summary must be
**inside the `AskUserQuestion` question text itself**, not only in the chat.
Print it in chat first, then repeat it in the question, in this form:

```
Commit <hash>: <commit message>
Files: <status> <path>, <status> <path>, ...
Goal: <one sentence>
Push to origin/main?
```

Options: **Push** / **Don't push** (the user may also pick Other to change the
message, in which case `git commit --amend` is allowed only because the commit
is not yet pushed).

Never push without an explicit "Push" answer in this run. Earlier approval does not carry over.

## Step 6 — Push

On approval: `git push origin main`. Never force-push. If the push is rejected
(remote ahead), report it and ask; don't pull/rebase on your own.

Finish with one line: pushed hash range, or "committed locally, not pushed".
