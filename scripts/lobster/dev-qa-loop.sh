#!/bin/bash
# dev-qa-loop.sh - Handles the coder/QA retry cycle
# Args: project task task_slug max_retries
# Env:  SPEC_PATH (optional, from architect stage)

set -euo pipefail

PROJECT="$1"
TASK="$2"
TASK_SLUG="$3"
MAX_RETRIES="${4:-3}"
SPEC_PATH="${SPEC_PATH:-}"

EXTRACT="$(dirname "$0")/extract-output.sh"

QA_NOTES=""
PR_URL=""

for attempt in $(seq 1 "$MAX_RETRIES"); do
  echo "=== Dev/QA Cycle: attempt $attempt of $MAX_RETRIES ===" >&2

  # ── Coder: implement or revise ────────────────────────────────────────
  if [ -z "$QA_NOTES" ]; then
    CODER_PROMPT="Implement the following task for project ${PROJECT}: ${TASK}
$([ -n "$SPEC_PATH" ] && echo "Spec file: ${SPEC_PATH}")
Use the git workflow. Create branch agent/${PROJECT}/${TASK_SLUG}, implement the feature, open a PR.
End your response with a [PIPELINE_OUTPUT] block:
{\"status\":\"complete\",\"artifact\":\"<PR URL>\",\"summary\":\"<one line>\",\"notes\":\"<anything unusual>\"}"
  else
    CODER_PROMPT="Revise your PR for project ${PROJECT}, task: ${TASK}
QA review failed with these issues:
${QA_NOTES}

Address all issues on the existing branch agent/${PROJECT}/${TASK_SLUG}.
Push fixes and update the PR.
End your response with a [PIPELINE_OUTPUT] block:
{\"status\":\"complete\",\"artifact\":\"<PR URL>\",\"summary\":\"<what you fixed>\",\"notes\":\"<anything remaining>\"}"
  fi

  echo "Running coder agent..." >&2
  CODER_RAW=$(openclaw agent --agent coder --json --timeout 1800 \
    --message "$CODER_PROMPT" 2>&1) || {
    echo "ERROR: coder agent invocation failed on attempt $attempt" >&2
    QA_NOTES="Coder failed to run. Retrying."
    continue
  }

  # Extract the agent's reply text from the JSON envelope
  CODER_TEXT=$(echo "$CODER_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    # Try common reply fields
    print(d.get('result', d.get('reply', d.get('text', str(d)))))
except:
    print(sys.stdin.read())
" 2>/dev/null || echo "$CODER_RAW")

  CODER_JSON=$(echo "$CODER_TEXT" | "$EXTRACT" 2>/dev/null) || {
    echo "ERROR: coder did not return a [PIPELINE_OUTPUT] block on attempt $attempt" >&2
    QA_NOTES="No structured output block. Please end your response with a [PIPELINE_OUTPUT] JSON block."
    continue
  }

  PR_URL=$(echo "$CODER_JSON" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('artifact',''))")

  if [ -z "$PR_URL" ]; then
    echo "ERROR: coder did not return a PR URL on attempt $attempt" >&2
    QA_NOTES="No PR URL in your output. Please open a PR and return its URL in the artifact field."
    continue
  fi

  echo "Coder done. PR: $PR_URL" >&2

  # ── QA: review the PR ─────────────────────────────────────────────────
  QA_PROMPT="Review this PR for project ${PROJECT}:
PR: ${PR_URL}
Task: ${TASK}
$([ -n "$SPEC_PATH" ] && echo "Spec: ${SPEC_PATH}")

Use gh pr view to inspect the diff. Check against PROJECT.md conventions.
Be specific about any issues — exact files and lines.
End your response with a [PIPELINE_OUTPUT] block:
{\"status\":\"pass OR fail\",\"artifact\":\"${PR_URL}\",\"summary\":\"<one line verdict>\",\"notes\":\"<specific issues if fail, empty string if pass>\"}"

  echo "Running QA agent..." >&2
  QA_RAW=$(openclaw agent --agent qa --json --timeout 600 \
    --message "$QA_PROMPT" 2>&1) || {
    echo "ERROR: QA agent invocation failed on attempt $attempt" >&2
    continue
  }

  QA_TEXT=$(echo "$QA_RAW" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('result', d.get('reply', d.get('text', str(d)))))
except:
    print(sys.stdin.read())
" 2>/dev/null || echo "$QA_RAW")

  QA_JSON=$(echo "$QA_TEXT" | "$EXTRACT" 2>/dev/null) || {
    echo "ERROR: QA did not return a [PIPELINE_OUTPUT] block on attempt $attempt" >&2
    continue
  }

  QA_STATUS=$(echo "$QA_JSON" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('status','fail'))")
  QA_NOTES=$(echo "$QA_JSON" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('notes',''))")

  echo "QA status: $QA_STATUS" >&2

  if [ "$QA_STATUS" = "pass" ]; then
    echo "✅ QA passed on attempt $attempt" >&2
    echo "[PIPELINE_OUTPUT]"
    python3 -c "
import json
print(json.dumps({
  'status': 'merged_ready',
  'artifact': '$PR_URL',
  'summary': 'QA passed on attempt $attempt',
  'notes': ''
}))
"
    echo "[/PIPELINE_OUTPUT]"
    exit 0
  fi

  echo "QA failed on attempt $attempt. Notes: $QA_NOTES" >&2
done

# Max retries exceeded
echo "⚠️  Max retries ($MAX_RETRIES) exceeded" >&2
echo "[PIPELINE_OUTPUT]"
python3 -c "
import json, sys
print(json.dumps({
  'status': 'failed',
  'artifact': '${PR_URL}',
  'summary': 'QA failed after ${MAX_RETRIES} attempt(s)',
  'notes': '${QA_NOTES}'
}))
"
echo "[/PIPELINE_OUTPUT]"
exit 1
