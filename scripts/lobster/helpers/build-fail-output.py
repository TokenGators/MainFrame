#!/usr/bin/env python3
"""
build-fail-output.py - Build PIPELINE_OUTPUT JSON for max retries exceeded

Args: PR_URL (positional), MAX_RETRIES (positional), QA_NOTES (positional)
Reads nothing from stdin.
Outputs full PIPELINE_OUTPUT block to stdout with failed status.
"""
import sys
import json

PR_URL = sys.argv[1] if len(sys.argv) > 1 else ''
MAX_RETRIES = sys.argv[2] if len(sys.argv) > 2 else '0'
QA_NOTES = sys.argv[3] if len(sys.argv) > 3 else ''

print("[PIPELINE_OUTPUT]")
print(json.dumps({
    'status': 'failed',
    'artifact': PR_URL,
    'summary': f'QA failed after {MAX_RETRIES} attempt(s)',
    'notes': QA_NOTES
}))
print("[/PIPELINE_OUTPUT]")
