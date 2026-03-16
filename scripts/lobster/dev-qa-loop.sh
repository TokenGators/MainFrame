#!/bin/bash
# dev-qa-loop.sh - Handles the coder/QA retry cycle
# Args: project task task_slug max_retries
# Env:  SPEC_PATH (optional, from architect stage)

set -uo pipefail
# NOTE: set -e intentionally omitted — || { continue } patterns need to survive
# individual step failures without killing the whole script.

PROJECT="$1"
TASK="$2"
TASK_SLUG="$3"
MAX_RETRIES="${4:-3}"
SPEC_PATH="${SPEC_PATH:-}"

# Resolve EXTRACT relative to this script's location (survives branch switches)
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
    # Fallback: older envelope shapes
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

for attempt in $(seq 1 "$MAX_RETRIES"); do
  echo "=== Dev/QA Cycle: attempt $attempt of $MAX_RETRIES ===" >&2

  # ── Coder: implement or revise ────────────────────────────────────────
  if [ -z "$QA_NOTES" ]; then
    SPEC_LINE=""
    [ -n "$SPEC_PATH" ] && SPEC_LINE="Spec file: ${SPEC_PATH}"
    CODER_PROMPT="Implement the following task for project ${PROJECT}: ${TASK}
${SPEC_LINE}
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
    --message "$CODER_PROMPT" 2>&1)
  CODER_EXIT=$?

  if [ $CODER_EXIT -ne 0 ]; then
    echo "ERROR: coder agent invocation failed (exit $CODER_EXIT) on attempt $attempt" >&2
    QA_NOTES="Coder failed to run. Retrying."
    continue
  fi

  CODER_TEXT=$(echo "$CODER_RAW" | extract_agent_text)

  if [ -z "$CODER_TEXT" ]; then
    echo "ERROR: could not extract text from coder response on attempt $attempt" >&2
    QA_NOTES="Could not parse coder response. Please end your response with a [PIPELINE_OUTPUT] JSON block."
    continue
  fi

  CODER_JSON=$(echo "$CODER_TEXT" | "$EXTRACT" 2>/dev/null)
  EXTRACT_EXIT=$?

  if [ $EXTRACT_EXIT -ne 0 ] || [ -z "$CODER_JSON" ]; then
    echo "ERROR: coder did not return a [PIPELINE_OUTPUT] block on attempt $attempt" >&2
    echo "Coder text was: $CODER_TEXT" >&2
    QA_NOTES="No structured output block found. Please end your response with a [PIPELINE_OUTPUT] JSON block."
    continue
  fi

  PR_URL=$(echo "$CODER_JSON" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); print(d.get('artifact',''))" 2>/dev/null || echo "")

  if [ -z "$PR_URL" ]; then
    echo "ERROR: coder did not return a PR URL on attempt $attempt" >&2
    QA_NOTES="No PR URL in your output. Please open a PR and return its URL in the artifact field."
    continue
  fi

  echo "Coder done. PR: $PR_URL" >&2

  # ── QA: review the PR ─────────────────────────────────────────────────
  SPEC_LINE=""
  [ -n "$SPEC_PATH" ] && SPEC_LINE="Spec: ${SPEC_PATH}"
  QA_PROMPT="Review this PR for project ${PROJECT}:
PR: ${PR_URL}
Task: ${TASK}
${SPEC_LINE}

Use gh pr view to inspect the diff. Check against PROJECT.md conventions.
Be specific about any issues — exact files and lines.
End your response with a [PIPELINE_OUTPUT] block:
{\"status\":\"pass OR fail\",\"artifact\":\"${PR_URL}\",\"summary\":\"<one line verdict>\",\"notes\":\"<specific issues if fail, empty string if pass>\"}"

  echo "Running QA agent..." >&2
  QA_RAW=$(openclaw agent --agent qa --json --timeout 600 \
    --message "$QA_PROMPT" 2>&1)
  QA_INVOKE_EXIT=$?

  if [ $QA_INVOKE_EXIT -ne 0 ]; then
    echo "ERROR: QA agent invocation failed (exit $QA_INVOKE_EXIT) on attempt $attempt" >&2
    continue
  fi

  QA_TEXT=$(echo "$QA_RAW" | extract_agent_text)
  QA_JSON=$(echo "$QA_TEXT" | "$EXTRACT" 2>/dev/null || echo "")

  if [ -z "$QA_JSON" ]; then
    echo "ERROR: QA did not return a [PIPELINE_OUTPUT] block on attempt $attempt" >&2
    echo "QA text was: $QA_TEXT" >&2
    continue
  fi

  QA_STATUS=$(echo "$QA_JSON" | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('status','fail'))" 2>/dev/null || echo "fail")
  QA_NOTES=$(echo "$QA_JSON"  | python3 -c "import sys,json; print(json.loads(sys.stdin.read()).get('notes',''))"  2>/dev/null || echo "")

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
    openclaw system event --text "Pipeline complete: ${PROJECT}/${TASK_SLUG} — QA passed, PR ready: ${PR_URL}" --mode now 2>/dev/null || true
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
openclaw system event --text "Pipeline FAILED: ${PROJECT}/${TASK_SLUG} — exceeded max retries. Last PR: ${PR_URL:-none}" --mode now 2>/dev/null || true
exit 1
