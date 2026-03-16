#!/bin/bash
# extract-output.sh
# Extracts [PIPELINE_OUTPUT] JSON block from agent stdout (or stdin)
# Usage: echo "$agent_output" | ./extract-output.sh
#    or: ./extract-output.sh "$agent_output"

input="${1:-$(cat)}"

output=$(echo "$input" | \
  sed -n '/\[PIPELINE_OUTPUT\]/,/\[\/PIPELINE_OUTPUT\]/p' | \
  grep -v '\[PIPELINE_OUTPUT\]' | \
  grep -v '\[\/PIPELINE_OUTPUT\]' | \
  sed '/^[[:space:]]*$/d')

if [ -z "$output" ]; then
  echo '{"status":"error","artifact":"","summary":"No pipeline output block found","notes":"Agent did not return structured output"}'
  exit 1
fi

echo "$output" | python3 -m json.tool --compact 2>/dev/null || echo "$output"
