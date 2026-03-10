#!/bin/bash
# Monorepo-aware git workflow for OpenClaw agents
# Follows: GitHub Monorepo Architecture & Workflow standards
#
# Usage:
# ./scripts/git-workflow.sh start <project> <task>
# ./scripts/git-workflow.sh save <type> <project> <message>
# ./scripts/git-workflow.sh submit <project> <task> <message>
# ./scripts/git-workflow.sh status
# ./scripts/git-workflow.sh finish <project>

set -e
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

ACTION=$1
PROJECT=$2
TASK=$3
EXTRA=$4

AGENT_SYSTEM="${OPENCLAW_AGENT_SYSTEM:-OpenClaw}"
INITIATED_BY="${OPENCLAW_INITIATED_BY:-unknown}"

# ─── Helpers ───

update_workspace() {
 local project=$1 status=$2 task=$3 branch=$4
 local ws="projects/$project/WORKSPACE.md"
 [[ ! -f "$ws" ]] && echo "⚠️ No WORKSPACE.md at $ws" && return
 local today=$(date +%Y-%m-%d)
 cat > "$ws" << EOF
# Workspace Status

**Status:** $status
**Last updated:** $today
**Working on:** $task
**Branch:** $branch
**Initiated by:** $INITIATED_BY
**Agent system:** $AGENT_SYSTEM

## Recent activity log
- $today: $task
EOF
}

check_workspace() {
 local ws="projects/$1/WORKSPACE.md"
 if [[ -f "$ws" ]] && grep -q "ACTIVE" "$ws"; then
 echo "⚠️ WORKSPACE.md shows ACTIVE for $1"
 grep "Working on:\|Agent system:" "$ws"
 echo "Proceeding anyway (soft lock)."
 fi
}

validate_project() {
 if [[ ! -d "projects/$1" ]]; then
 echo "❌ Project 'projects/$1' not found."
 ls projects/ 2>/dev/null | sed 's/^/ /'
 exit 1
 fi
}

# ─── Actions ───

case $ACTION in
 start)
 [[ -z "$PROJECT" || -z "$TASK" ]] && echo "Usage: start <project> <task>" && exit 1
 validate_project "$PROJECT"
 check_workspace "$PROJECT"
 BRANCH="agent/$PROJECT/$TASK"
 git checkout dev && git pull origin dev
 git checkout -b "$BRANCH"
 update_workspace "$PROJECT" "ACTIVE" "$TASK" "$BRANCH"
 git add "projects/$PROJECT/WORKSPACE.md"
 git commit -m "chore[$PROJECT] start work on $TASK

Agent: $AGENT_SYSTEM
Initiated by: $INITIATED_BY"
 git push origin "$BRANCH"
 echo "✅ Branch $BRANCH created, WORKSPACE.md → ACTIVE"
 ;;

 save)
 TYPE=$2; PROJECT=$3; MESSAGE=$4
 [[ -z "$TYPE" || -z "$PROJECT" || -z "$MESSAGE" ]] && \
 echo "Usage: save <type> <project> <message>" && exit 1
 validate_project "$PROJECT"
 git add "projects/$PROJECT/"
 git commit -m "$TYPE[$PROJECT] $MESSAGE

Agent: $AGENT_SYSTEM
Initiated by: $INITIATED_BY"
 git push origin "$(git branch --show-current)"
 echo "✅ Committed: $TYPE[$PROJECT] $MESSAGE"
 ;;

 submit)
 [[ -z "$PROJECT" || -z "$TASK" ]] && echo "Usage: submit <project> <task> <msg>" && exit 1
 validate_project "$PROJECT"
 MESSAGE="${EXTRA:-"$TASK complete — ready for review"}"
 BRANCH="$(git branch --show-current)"
 update_workspace "$PROJECT" "IDLE" "PR submitted for $TASK" "$BRANCH"
 git add "projects/$PROJECT/"
 git commit -m "chore[$PROJECT] submit $TASK for review

Agent: $AGENT_SYSTEM
Initiated by: $INITIATED_BY" || true
 git push origin "$BRANCH"
 gh pr create \
 --base dev --head "$BRANCH" \
 --title "feat[$PROJECT]: $MESSAGE" \
 --body "## What this does
$MESSAGE

## Project
\`/projects/$PROJECT\`

## Type of change
- [x] New feature

## Agent info (if applicable)
- Agent system: $AGENT_SYSTEM
- Initiated by: $INITIATED_BY
- Branch: $BRANCH

## Testing done
- [ ] Runs locally
- [ ] No console errors
- [ ] Reviewed output visually

## WORKSPACE.md updated?
- [x] Set to IDLE after this PR"
 echo "✅ PR created: $BRANCH → dev"
 ;;

 finish)
 [[ -z "$PROJECT" ]] && echo "Usage: finish <project>" && exit 1
 validate_project "$PROJECT"
 update_workspace "$PROJECT" "IDLE" "Work complete" "dev"
 git add "projects/$PROJECT/WORKSPACE.md"
 git commit -m "chore[$PROJECT] set workspace to IDLE

Agent: $AGENT_SYSTEM
Initiated by: $INITIATED_BY" || true
 git push origin "$(git branch --show-current)" || true
 git checkout dev && git pull origin dev
 echo "✅ Back on dev, WORKSPACE.md → IDLE"
 ;;

 status)
 echo "=== Current Branch ==="
 git branch --show-current
 echo ""
 echo "=== Active Workspaces ==="
 for ws in projects/*/WORKSPACE.md; do
 [[ -f "$ws" ]] || continue
 project=$(echo "$ws" | cut -d'/' -f2)
 status=$(grep "Status:" "$ws" | head -1 | sed 's/.*\*\*//;s/\*\*//')
 task=$(grep "Working on:" "$ws" | head -1 | sed 's/.*\*\*//;s/\*\*//')
 echo " $project: $status — $task"
 done
 echo ""
 echo "=== Agent Branches ==="
 git branch -a | grep "agent/" | sed 's/^/ /'
 echo ""
 echo "=== Open Pull Requests ==="
 gh pr list
 ;;

 *)
 echo "Monorepo Git Workflow"
 echo ""
 echo " start <project> <task> Create feature branch"
 echo " save <type> <project> <msg> Commit & push"
 echo " submit <project> <task> <msg> Open PR to dev"
 echo " finish <project> Set IDLE, return to dev"
 echo " status Show all status"
 echo ""
 echo "Types: feat | fix | refactor | docs | chore | import"
 ;;
esac
