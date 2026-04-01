#!/usr/bin/env python3
"""
extract-agent-text.py - Extract reply text from openclaw agent --json output

Reads JSON from stdin, tries multiple keys to find the reply text.
Prints the text to stdout.
Outputs to stderr on errors.
"""
import sys
import json

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
