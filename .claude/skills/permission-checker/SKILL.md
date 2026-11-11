---
name: permission-checker
description: Read-only security audit of Claude Code permission settings. Reads the user, project, local and managed settings files and reports suspicious, harmful or insecure permission rules, sorted by the risk catalogue. Use when the user asks for a settings security audit, permissions audit or permission check.
allowed-tools: Read, Glob, Grep
---

# Permission checker: settings security audit

**Read-only.** Never write, edit, move or delete any file, and never run shell
commands that change anything. Only give information. Do not offer to apply fixes;
show them as ready-to-copy rules for the user to apply.

The risk levels and their criteria come from the catalogue file
`.claude/skills/permission-checker/risk-catalogue.md` (next to this file). Do not
use any risk level or criterion that is not in that file.

## Step 1: Read all settings files and identify rules

Read every file that exists. A missing file is not an error; note it as "not found".

| Scope | Path |
|---|---|
| User | `~/.claude/settings.json` |
| Project | `.claude/settings.json` (repo root) |
| Local | `.claude/settings.local.json` (repo root) |
| Managed (macOS) | `/Library/Application Support/ClaudeCode/managed-settings.json` |
| Managed (Linux/WSL) | `/etc/claude-code/managed-settings.json` |
| Managed (Windows) | `C:\Program Files\ClaudeCode\managed-settings.json` |

Also check any managed drop-in folder (`managed-settings.d/`) next to the managed
file, if it exists. If a file can't be read (permissions, invalid JSON), say so in
the report and mark it "needs manual check". Never guess its contents.

From each file extract:

- `permissions.allow`, `permissions.ask`, `permissions.deny`
- `permissions.defaultMode`, `permissions.additionalDirectories`
- `permissions.disableBypassPermissionsMode` and similar switches
- anything else that widens access: `enableAllProjectMcpServers`,
  `enabledMcpjsonServers`, `hooks`, `env`, `sandbox` settings, `apiKeyHelper`,
  `skipDangerousModePermissionPrompt` and `allowedTools`-style keys

Keep, for every rule: the exact text, the list it is in, and the source file.
Remember precedence: managed > local > project > user, and `deny` wins over `ask`
and `allow`. A risky `allow` that is already blocked by a `deny` in a higher or
equal scope is lower in practice. Say so, don't hide it.

## Step 2: Sort each threat by risk level

1. Read `risk-catalogue.md`.
2. **If it is empty or has no levels, stop.** Tell the user the catalogue is empty
   and ask them to fill it in. Don't produce a report.
3. Match each rule against the catalogue criteria and assign exactly one level.
4. A rule that looks risky but matches no catalogue criterion is not a finding.
   List it under "Needs manual check" with the reason, without a level.
5. Secure rules are not findings. Do not list them.

## Step 3: Report

Order findings from the highest risk level to the lowest, using the catalogue's
level order. Use a table, or one block per finding if the text is long:

| Risk level | Rule | Source file | Why it is dangerous (with example) | How to fix (ready rule) |
|---|---|---|---|---|

For each finding:

- **Rule:** exact text and list (`allow`, `ask`, ...).
- **Source file:** full path and scope.
- **Why dangerous:** the reason and a concrete example of the harm, for example
  what an attacker or a mistaken command could do with this rule. Cite the
  catalogue criterion that applies.
- **How to fix:** the replacement or added rule, ready to paste (for example the
  narrowed `allow` entry, or the `deny` entry to add), and which file to put it in.
- **Confidence:** mark `Not sure` or `Check manually` when the risk depends on
  something you can't see (environment, other tools, MCP server contents, a file
  you couldn't read, behavior of the Claude Code version). Say what to check.

After the table, add:

- **Needs manual check:** unclear items, unreadable files, rules outside the catalogue.
- **What is missing:** protections that are absent. Only report what you can
  support from the files read, for example no `deny` for secrets files (`.env`,
  `~/.ssh`), no `deny` for destructive commands, no managed settings found.
- **What is fine:** a short summary in one or two sentences of the areas that look
  safe. Do not list individual secure rules.
- **Files read:** each path with status (read / not found / unreadable).

## Rules

- Do not invent findings. Every finding must quote a rule that exists in a file you read.
- Do not report secure rules as findings.
- Give the argument and reason for every finding; no bare verdicts.
- If nothing is found, say so plainly, with the files read.
- Do not modify any file, including settings, the catalogue and the report. Output the report in chat only.
