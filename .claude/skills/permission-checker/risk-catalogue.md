**CRITICAL — the agent can do anything or leak data**
- Allow `Bash` or `Bash(*)`: any command runs without asking.
- `defaultMode: "bypassPermissions"` outside a container/VM.
- Allow rules for interpreters and runners that execute arbitrary code: `Bash(python *)`, `Bash(python3 *)`, `Bash(node *)`, `Bash(npx *)`, `Bash(bash *)`, `Bash(sh *)`, `Bash(zsh *)`, `Bash(eval *)`, `Bash(docker exec *)`, `Bash(docker run *)`, `Bash(devbox run *)`, `Bash(mise exec *)`, `Bash(direnv exec *)`.
- Allow rules for network utilities: `Bash(curl *)`, `Bash(wget *)`, `Bash(nc *)`, `Bash(ssh *)`, `Bash(scp *)`, `Bash(rsync *)`.
- Allow `Bash(sudo *)`, `Bash(su *)`.
- Allow Edit/Read on the whole disk or the home directory: `Edit(//**)`, `Edit(~/**)`, `Read(//**)`, `Read(~/**)`.
- `additionalDirectories` that contains `/`, `~`, or the home folder.

**HIGH — destructive or irreversible actions**
- Allow `Bash(rm *)`, `Bash(rm -rf *)`, `Bash(git push *)`, `Bash(git reset *)`, `Bash(git clean *)`, `Bash(git checkout *)`, `Bash(chmod *)`, `Bash(chown *)`, `Bash(kubectl *)`, `Bash(terraform *)`, `Bash(aws *)`, `Bash(gcloud *)`, `Bash(az *)`, `Bash(npm publish *)`.
- Allow rules with `*` before the subcommand, or on a bare program: `Bash(git *)`, `Bash(npm *)`, `Bash(docker *)`, `Bash(git * main)`. These allow both safe and dangerous subcommands.
- Allow `WebFetch` (bare name) or `WebFetch(domain:*)`: any website.
- Allow an entire MCP server that has write tools: `mcp__<server>__*` (check whether the server can create, delete, or send).
- No deny rules for secrets: `.env`, `.env.*`, `secrets/**`, `~/.ssh/**`, `~/.aws/**`, `~/.config/gcloud/**`, `*.pem`, `*.key`.
- Reading secrets is allowed and any network egress is also allowed. Together, these give a path for data exfiltration.

**MEDIUM — the rule doesn't do what it seems to (false sense of security)**
- A path starting with a single `/` that looks absolute: `Read(/Users/...)`, `Read(/home/...)`, `Read(/etc/...)`. This is NOT the disk root; it must be `//`.
- A `/` rule in user settings (`~/.claude/settings.json`), such as `Read(/secrets/**)`, protects `~/.claude/secrets`, not a folder in the project.
- Path rules for `Write(...)`, `Glob(...)`, `NotebookEdit(...)`, `MultiEdit(...)` are never applied; use `Edit(...)` / `Read(...)` instead.
- `Bash(command:...)` is ignored.
- `:*` not at the end, e.g. `Bash(git:* push)`: the colon is literal, so the rule is dead.
- Unanchored allow globs `*`, `B*`, `mcp__*` are ignored and allow nothing.
- `Bash(ls*)` and `Bash(cat*)` without a space are broader than they look (they also match `lsof`, `catdoc`).
- Deny rules on Bash are treated as a wall, but `deny Bash(git push *)` doesn't stop `git -C . push`, `/usr/bin/git push`, or `sh -c '...'`. Flag it as informational if there's no sandbox.
- An allow exception meant to "override" a deny: with `deny Bash(aws *)` + `allow Bash(aws s3 ls)`, the allow will never take effect.

**LOW / HYGIENE**
- Many narrow rules in `.claude/settings.local.json` that piled up from clicking "don't ask again". These are worth reviewing.
- Duplicates across settings levels.
- `disableBypassPermissionsMode` is not set (especially for a team project).