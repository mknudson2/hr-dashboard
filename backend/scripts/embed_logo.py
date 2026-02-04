#!/usr/bin/env python3
"""Script to read the base64 logo and output it as a data URI."""

with open('/tmp/nbs-logo-base64.txt', 'r') as f:
    base64_data = f.read().strip()

print(f"data:image/jpeg;base64,{base64_data}")
