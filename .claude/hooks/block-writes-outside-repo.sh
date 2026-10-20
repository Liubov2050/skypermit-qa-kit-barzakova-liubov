#!/bin/bash
# PreToolUse hook for Edit|Write|NotebookEdit: deny any file write outside this repo.
# Fail closed: without jq the target can't be parsed, so block (exit 2) rather than allow.
command -v jq >/dev/null || { echo "jq is required by block-writes-outside-repo.sh" >&2; exit 2; }

input=$(cat)
root=$(realpath "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}")
target=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")

[ -z "$target" ] && exit 0
case "$target" in /*) ;; *) target="${cwd:-$PWD}/$target" ;; esac

# Resolve symlinks and ".." via the deepest existing ancestor (the file may not exist yet).
dir=$target rest=""
while [ ! -e "$dir" ]; do
  rest="/$(basename "$dir")$rest"
  dir=$(dirname "$dir")
done
case "$rest" in *"/.."*) resolved="" ;; *) resolved="$(realpath "$dir")$rest" ;; esac

case "$resolved" in
  "$root" | "$root"/*) exit 0 ;;
esac

# Claude Code's own state: memory, plans, and the per-session scratchpad.
# An empty path would turn the pattern into "/*", so only check directories that resolve.
for allowed in "$HOME/.claude" "/tmp/claude-$(id -u)"; do
  allowed=$(realpath "$allowed" 2>/dev/null) || continue
  [ -n "$allowed" ] || continue
  case "$resolved" in "$allowed"/*) exit 0 ;; esac
done

jq -n --arg p "$target" --arg r "$root" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: "Writes are only allowed inside \($r). Blocked: \($p)"
  }
}'
