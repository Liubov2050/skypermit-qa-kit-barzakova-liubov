# Permission audit: 2026-11-12

Findings: CRITICAL 0 · HIGH 1 · MEDIUM 0 · LOW 2

## Findings

| Risk level | Rule | Source file | Why it is dangerous (with example) | How to fix (ready rule) | Confidence |
|---|---|---|---|---|---|
| HIGH | No `deny` for most secrets paths (only `Read(//Users/liubovbarzakova/skypermit/ct-gen-ai-skypermit/.env*)`, `Read(/ct-gen-ai-skypermit/.env*)`, `Read(/.env*)` exist in `deny`) | `/Users/liubovbarzakova/skypermit/skypermit-qa-kit-barzakova-liubov/.claude/settings.json` (project) | Catalogue HIGH: no deny for `secrets/**`, `~/.ssh/**`, `~/.aws/**`, `~/.config/gcloud/**`, `*.pem`, `*.key`.<br>Example: a prompt-injected instruction in a doc could make Claude read `~/.ssh/id_rsa` or a `.pem` file and print it into the chat or a test file.<br>Exfiltration path is currently limited: `WebFetch`/`WebSearch` are denied and no network `Bash` is allowed (curl would prompt). | Add to `deny` in `.claude/settings.json`:<br>`"Read(~/.ssh/**)"`, `"Read(~/.aws/**)"`, `"Read(~/.config/gcloud/**)"`, `"Read(//**/secrets/**)"`, `"Read(//**/*.pem)"`, `"Read(//**/*.key)"`, `"Read(//**/.env.*)"` | Check manually: `Read` denies don't stop `Bash(cat ...)`; verify that Bash prompts for such commands in your mode. |
| LOW | `disableBypassPermissionsMode` not set | all files read (user, project, local; no managed file) | Catalogue LOW: bypass mode can be switched on by anyone using this project, which skips all prompts and the `ask` rules (e.g. `git push`). | Add to `.claude/settings.json`:<br>`"permissions": { "disableBypassPermissionsMode": "disable" }` | Confident |
| LOW | Duplicate `statusLine` (`bash ~/.claude/statusline.sh`) | `~/.claude/settings.json` (user) and `/Users/liubovbarzakova/skypermit/skypermit-qa-kit-barzakova-liubov/.claude/settings.json` (project) | Catalogue LOW: duplicates across levels. Same value in both, so no risk now, but the two can drift apart. Note: the project copy runs `bash` on a home-directory script. | Remove the `statusLine` block from `.claude/settings.json` (project) and keep the user one. | Confident (hygiene only) |

## Needs manual check

| Item | Source file | Why it needs a manual check |
|---|---|---|
| `Edit(//Users/liubovbarzakova/skypermit/ct-gen-ai-skypermit/**)` deny does not cover shell commands | `.claude/settings.json` (project) | No sandbox is configured and `Bash` is not denied for that folder, so `sed -i`, `mv`, `rm` or `git checkout` could change the read-only app. Not a catalogue criterion. CLAUDE.md relies on discipline here. Consider a `Bash` ask rule or a sandbox. |
| `Bash(node coverage/find-gaps.mjs)` in `allow` | `.claude/settings.local.json` (local) | The rule is exact, so it is not the catalogued `node *`. But `Edit` is allowed on the whole repo, so Claude could change `coverage/find-gaps.mjs` and then run it without a prompt. Not read in this audit. |
| `PreToolUse` hook `.claude/hooks/block-writes-outside-repo.sh` | `.claude/settings.json` (project) | Hook script contents were not audited. Check that it really blocks writes outside the repo and does not fail open. |
| `SessionEnd` hook `node "$CLAUDE_PROJECT_DIR"/.claude/hooks/usage-report.mjs` | `.claude/settings.json` (project) | Runs code automatically at the end of each session. Not a catalogued criterion. Check what the script reads, writes or sends. |
| `Bash(git push)` / `Bash(git push *)` in `ask` are in the local file, while CLAUDE.md says they are in `.claude/settings.json` | `.claude/settings.local.json` (local) | If the local file is git-ignored, a fresh clone has no push protection. Check where the rule should live. |

## What is missing

| Missing protection | Evidence (files read) | Suggested rule |
|---|---|---|
| Managed settings | None of the managed paths exist (macOS file, `managed-settings.d/`, `/etc/claude-code`) | Only needed for team or enforced policy: `/Library/Application Support/ClaudeCode/managed-settings.json` with `"permissions": { "disableBypassPermissionsMode": "disable" }` |
| `deny` for destructive commands | Project and local `permissions` have no `deny` for `rm`, `git reset`, `git clean`, `git checkout` | `"Bash(rm -rf *)"`, `"Bash(git reset --hard*)"`, `"Bash(git clean *)"` in `deny` (project). Remember they don't stop `sh -c` or `git -C` variants. |
| `deny` for secrets outside `.env*` | See HIGH finding | See HIGH finding |

## What is fine

No broad `Bash`, interpreter, network or `sudo` allows exist, `defaultMode` is not `bypassPermissions`, and `additionalDirectories` only lists the app folder. The `Edit` allow is limited to this repo, and path rules use the right `//` and project-relative `/` forms. `WebFetch` and `WebSearch` are denied, and `git push`, installs and builds are in `ask`.

## Files read

| Scope | Path | Status |
|---|---|---|
| User | `/Users/liubovbarzakova/.claude/settings.json` | read |
| Project | `/Users/liubovbarzakova/skypermit/skypermit-qa-kit-barzakova-liubov/.claude/settings.json` | read |
| Local | `/Users/liubovbarzakova/skypermit/skypermit-qa-kit-barzakova-liubov/.claude/settings.local.json` | read |
| Managed (macOS) | `/Library/Application Support/ClaudeCode/managed-settings.json` | not found |
| Managed drop-in (macOS) | `/Library/Application Support/ClaudeCode/managed-settings.d/` | not found |
| Managed (Linux/WSL) | `/etc/claude-code/managed-settings.json` | not found |
| Managed (Windows) | `C:\Program Files\ClaudeCode\managed-settings.json` | not applicable (macOS) |
