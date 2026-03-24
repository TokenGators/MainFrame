#!/usr/bin/env python3
"""
build-pass-output.py - Build PIPELINE_OUTPUT JSON for QA pass case

Args: PR_URL (positional), ATTEMPT_NUMBER (positional)
Reads nothing from stdin.
Outputs full PIPELINE_OUTPUT block to stdout with merged_ready status.
"""
import sys
import json

PR_URL = sys.argv[1] if len(sys.argv) > 1 else ''
ATTEMPT = sys.argv[2] if len(sys.argv) > 2 else 'unknown'

print("[PIPELINE_OUTPUT]")
print(json.dumps({
    'status': 'merged_ready',
    'artifact': PR_URL,
    'summary': f'QA passed on attempt {ATTEMPT}',
    'notes': ''
}))
print("[/PIPELINE_OUTPUT]")
