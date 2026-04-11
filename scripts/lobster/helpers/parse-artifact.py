#!/usr/bin/env python3
"""
parse-artifact.py - Extract artifact URL from PIPELINE_OUTPUT JSON

Reads JSON from stdin, extracts 'artifact' field.
Prints the URL to stdout or empty string if not found.
"""
import sys
import json

try:
    d = json.loads(sys.stdin.read())
    print(d.get('artifact', ''))
except json.JSONDecodeError:
    print('', end='')
