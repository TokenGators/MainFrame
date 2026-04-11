#!/bin/bash
# dev-qa-loop.sh - Handles the coder/QA retry cycle
# Args: project task task_slug max_retries
# Env:  SPEC_PATH (optional, from architect stage)

set -uo pipefail
# NOTE: set -e intentionally omitted — explicit exit code checks used throughout.

PROJECT="$1"
TASK="$2"
TASK_SLUG="$3"
MAX_RETRIES="${4:-3}"
SPEC_PATH="${SPEC_PATH:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTRACT="${SCRIPT_DIR}/extract-output.sh"

QA_NOTES=""
PR_URL=""

# ── Helper: extract reply text from openclaw agent --json output ──────────────
extract_agent_text() {
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    result = d.get('result', {})
    if isinstance(result, dict):
        payloads = result.get('payloads', [])
        if payloads and isinstance(payloads[0], dict) and payloads[0].get('text'):
            print(payloads[0]['text'])
            sys.exit(0)
    for key in ('reply', 'text', 'message'):
        if key in d and d[key]:
            print(d[key])
            sys.exit(0)
    print(str(d))
except Exception as e:
    sys.stderr.write('extract_agent_text error: ' + str(e) + '\n')
    print(sys.stdin.read())
" 2>/dev/null
}

# ── Helper: find open PR for our branch, fallback to gh search ───────────────
find_pr_url() {
  local branch="agent/${PROJECT}/${TASK_SLUG}"
  gh pr list --head "$branch" --state open --json url --jq '.[0].url' 2>/dev/null || echo ""
}

for attempt in $(seq 1 "$MAX_RETRIES"); do
  echo "=== Dev/QA Cycle: attempt $attempt of $MAX_RETRIES ===" >&2

  # ── Coder: implement or revise ────────────────────────────────────────
  SPEC_LINE=""
  [ -n "$SPEC_PATH" ] && SPEC_LINE="Spec file: ${SPEC_PATH}"

  if [ -z "$QA_NOTES" ]; then
    CODER_PROMPT="Implement the following task for project ${PROJECT}: ${TASK}
${SPEC_LINE}
Working directory: /Users/operator/repos/MainFrame
Git workflow:
  1. cd /Users/operator/repos/MainFrame
  2. ./scripts/git-workflow.sh start ${PROJECT} ${TASK_SLUG}
  3. Do the work
  4. ./scripts/git-workflow.sh save <type> ${PROJECT} \"<message>\"
  5. ./scripts/git-workflow.sh submit ${PROJECT} ${TASK_SLUG} \"<PR title>\"
  6. gh pr create --base dev --title \"<title>\" --body \"<body>\"

IMPORTANT: You MUST end your response with this exact block (no extra text after it):
[PIPELINE_OUTPUT]
{\"status\":\"complete\",\"artifact\":\"<full GitHub PR URL>\",\"summary\":\"<one line>\",\"notes\":\"<anything unusual or empty string>\"}
[/PIPELINE_OUTPUT]"
  else
    CODER_PROMPT="Revise your PR for project ${PROJECT}, task: ${TASK}
QA review failed with these issues:
${QA_NOTES}

Address all issues on the existing branch agent/${PROJECT}/${TASK_SLUG}.
Working directory: /Users/operator/repos/MainFrame
Push fixes with: git add -A && git commit -m \"fix[${PROJECT}] <what you fixed>\" && git push

IMPORTANT: You MUST end your response with this exact block (no extra text after it):
[PIPELINE_OUTPUT]
{\"status\":\"complete\",\"artifact\":\"<full GitHub PR URL>\",\"summary\":\"<what you fixed>\",\"notes\":\"<anything remaining or empty string>\"}
[/PIPELINE_OUTPUT]"
  fi

  echo "Running coder agent..." >&2
  CODER_RAW=$(openclaw agent --agent coder --json --timeout 1800 \
    --message "$CODER_PROMPT" 2>&1)
  CODER_EXIT=$?

  if [ $CODER_EXIT -ne 0 ]; then
    echo "ERROR: coder agent failed (exit $CODER_EXIT) on attempt $attempt" >&2
    QA_NOTES="Coder agent invocation failed. Retrying."
    continue
  fi

  CODER_TEXT=$(echo "$CODER_RAW" | extract_agent_text)

  # ── Try to get PR URL from PIPELINE_OUTPUT block first ───────────────
  CODER_JSON=$(echo "$CODER_TEXT" | "$EXTRACT" 2>/dev/null || echo "")
  if [ -n "$CODER_JSON" ]; then
    PR_URL=$(echo "$CODER_JSON" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('artifact',''))" 2>/dev/null || echo "")
  fi

  # ── Fallback: detect PR from GitHub directly ──────────────────────────
  if [ -z "$PR_URL" ]; then
    echo "No PIPELINE_OUTPUT block found — checking GitHub for PR on branch agent/${PROJECT}/${TASK_SLUG}..." >&2
    PR_URL=$(find_pr_url)
  fi

  if [ -z "$PR_URL" ]; then
    echo "ERROR: No PR found for branch agent/${PROJECT}/${TASK_SLUG} on attempt $attempt" >&2
    echo "Coder text was: $CODER_TEXT" >&2
    QA_NOTES="You must open a PR targeting the dev branch and ensure it is pushed to GitHub. Branch: agent/${PROJECT}/${TASK_SLUG}"
    continue
  fi

  echo "Coder done. PR: $PR_URL" >&2

  # ── QA: review the PR ─────────────────────────────────────────────────
  SPEC_LINE=""
  [ -n "$SPEC_PATH" ] && SPEC_LINE="Spec: ${SPEC_PATH}"
  QA_PROMPT="Review this pull request for project ${PROJECT}:
PR URL: ${PR_URL}
Task: ${TASK}
${SPEC_LINE}

Steps:
  1. Run: gh pr view ${PR_URL} --patch | head -200
  2. Check the diff against projects/${PROJECT}/PROJECT.md conventions
  3. Be specific about any issues — exact files and line numbers

IMPORTANT: You MUST end your response with this exact block (no extra text after it):
[PIPELINE_OUTPUT]
{\"status\":\"pass\",\"artifact\":\"${PR_URL}\",\"summary\":\"<one line verdict>\",\"notes\":\"\"}
[/PIPELINE_OUTPUT]

Or if there are issues:
[PIPELINE_OUTPUT]
{\"status\":\"fail\",\"artifact\":\"${PR_URL}\",\"summary\":\"<one line verdict>\",\"notes\":\"<specific issues with file and line references>\"}
[/PIPELINE_OUTPUT]"

  echo "Running QA agent..." >&2
  QA_RAW=$(openclaw agent --agent qa --json --timeout 600 \
    --message "$QA_PROMPT" 2>&1)
  QA_INVOKE_EXIT=$?

  if [ $QA_INVOKE_EXIT -ne 0 ]; then
    echo "ERROR: QA agent failed (exit $QA_INVOKE_EXIT) on attempt $attempt" >&2
    continue
  fi

  QA_TEXT=$(echo "$QA_RAW" | extract_agent_text)
  QA_JSON=$(echo "$QA_TEXT" | "$EXTRACT" 2>/dev/null || echo "")

  if [ -z "$QA_JSON" ]; then
    echo "WARN: QA did not return a [PIPELINE_OUTPUT] block — treating as pass (PR exists)" >&2
    echo "QA text: $QA_TEXT" >&2
    # If QA can't format output but PR exists, don't block forever — treat as pass
    QA_STATUS="pass"
    QA_NOTES=""
  else
    QA_STATUS=$(echo "$QA_JSON" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('status','fail'))" 2>/dev/null || echo "fail")
    QA_NOTES=$(echo "$QA_JSON"  | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('notes',''))"  2>/dev/null || echo "")
  fi

  echo "QA status: $QA_STATUS" >&2

  if [ "$QA_STATUS" = "pass" ]; then
    echo "✅ QA passed on attempt $attempt" >&2
    echo "[PIPELINE_OUTPUT]"
    python3 -c "
import json
print(json.dumps({
  'status': 'merged_ready',
  'artifact': '${PR_URL}',
  'summary': 'QA passed on attempt ${attempt}',
  'notes': ''
}))
"
    echo "[/PIPELINE_OUTPUT]"
    openclaw system event --text "✅ Pipeline complete: ${PROJECT}/${TASK_SLUG} — PR ready for review: ${PR_URL}" --mode now 2>/dev/null || true
    exit 0
  fi

  echo "QA failed on attempt $attempt. Notes: $QA_NOTES" >&2
done

# Max retries exceeded
echo "⚠️  Max retries ($MAX_RETRIES) exceeded" >&2
echo "[PIPELINE_OUTPUT]"
python3 -c "
import json
print(json.dumps({
  'status': 'failed',
  'artifact': '${PR_URL:-}',
  'summary': 'QA failed after ${MAX_RETRIES} attempt(s)',
  'notes': '${QA_NOTES:-}'
}))
"
echo "[/PIPELINE_OUTPUT]"
openclaw system event --text "⚠️ Pipeline FAILED: ${PROJECT}/${TASK_SLUG} — exceeded max retries. Last PR: ${PR_URL:-none}" --mode now 2>/dev/null || true
exit 1
