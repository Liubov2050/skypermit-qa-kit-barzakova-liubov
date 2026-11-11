---
name: permission-checker
description: Read-only security audit of Claude Code permission settings. Reads the user, project, local and managed settings files and reports suspicious, harmful or insecure permission rules, sorted by the risk catalogue. Use when the user asks for a settings security audit, permissions audit or permission check.
allowed-tools: Read, Glob, Grep, Write
---

# Permission checker: settings security audit

**Read-only with respect to the audited files.** Never write, edit, move or delete
any settings file, the catalogue or any other existing file, and never run shell
commands that change anything. The only file you may create is the new report in
`reports/permission-audit/` (see Step 4). Do not offer to apply fixes; show them as
ready-to-copy rules for the user to apply.

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

Present **every part of the report as a Markdown table**. Never use bullet lists or
per-finding blocks for results, even if a cell gets long (keep cells short and
use `<br>` for line breaks inside a cell).

Start with a summary table of findings by risk level, one row per catalogue level in
the catalogue's order (include levels with 0 findings):

| Risk level | Findings |
|---|---|

Then order findings from the highest risk level to the lowest, using the catalogue's
level order, in one table, one row per finding:

| Risk level | Rule | Source file | Why it is dangerous (with example) | How to fix (ready rule) | Confidence |
|---|---|---|---|---|---|

For each finding (one row):

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

After the findings table, add these sections, each as its own table under a
heading:

**Needs manual check:** unclear items, unreadable files, rules outside the catalogue.

| Item | Source file | Why it needs a manual check |
|---|---|---|

**What is missing:** protections that are absent. Only report what you can
support from the files read, for example no `deny` for secrets files (`.env`,
`~/.ssh`), no `deny` for destructive commands, no managed settings found.

| Missing protection | Evidence (files read) | Suggested rule |
|---|---|---|

**What is fine:** a short summary in one or two sentences of the areas that look
safe (plain text, not a table). Do not list individual secure rules.

**Files read:** each path with status (read / not found / unreadable).

| Scope | Path | Status |
|---|---|---|

If a section has no entries, write "None" instead of an empty table.

## Step 4: Save the report

After showing the report in chat, save the same report as a Markdown file.

- **Folder:** `reports/permission-audit/` at the repo root. Do not use
  `reports/ws2/`, which holds the session usage reports.
- **File name:** `YYYY-MM-DD-permission-audit-N.md`, with today's date. Use Glob on
  `reports/permission-audit/YYYY-MM-DD-permission-audit-*.md` and take the next free
  `N` (start at `1`). Never overwrite an existing report.
- **Content:** start with `# Permission audit: YYYY-MM-DD`, then the full report
  from Step 3 (starting with the findings-by-risk-level table, then all other
  tables and the "What is fine" text), unchanged from what was shown in chat.
- Do not commit the file. Tell the user the saved path in the last line of the reply.
- If the catalogue is empty (Step 2) or nothing was audited, do not save a file.

## Rules

- Do not invent findings. Every finding must quote a rule that exists in a file you read.
- Do not report secure rules as findings.
- Give the argument and reason for every finding; no bare verdicts.
- If nothing is found, say so plainly, with the files read.
- Do not modify any existing file, including settings and the catalogue. The only
  allowed write is the new report file from Step 4. Show the report in chat as well.
