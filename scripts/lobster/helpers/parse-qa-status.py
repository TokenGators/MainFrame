#!/usr/bin/env python3
"""
parse-qa-status.py - Extract status and notes from PIPELINE_OUTPUT JSON

Reads JSON from stdin, extracts 'status' and 'notes' fields.
Outputs two lines to stdout:
  status_line = <status_value> (default: fail)
  notes_line = <notes_value>

Prints nothing on parse error.
"""
import sys
import json

try:
    d = json.loads(sys.stdin.read())
    status = d.get('status', 'fail')
    notes = d.get('notes', '')
    print(status)
    print(notes)
except json.JSONDecodeError:
    pass
