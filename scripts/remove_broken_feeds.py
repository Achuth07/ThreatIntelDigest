#!/usr/bin/env python3
"""
Script to remove all non-working feeds from rss-sources.ts
"""

import re

# List of feed names to remove (both active and commented out)
FEEDS_TO_REMOVE = [
    "Trustwave SpiderLabs",
    "Anomali",
    "FortiGuard Labs",
    "Microsoft Security Response Center",
    "Recorded Future (Threat Intelligence)",
    "Recorded Future (Cyber Threat Intelligence)",
    "Recorded Future (Vulnerability Management)",
    "Recorded Future (Research)",
    "Recorded Future (Geopolitical Intelligence)",
    "HackerOne",
    "Tripwire",
    "PhishLabs",
    "vx-underground",
    "Anton on Security",
    "Dark Reading (all)",
    "HACKMAGEDDON",
    "Dell SecureWorks (Research & Intelligence)",
    "Webroot Threat Blog",
    "IBM Security Intelligence",
    "Signals Corps",
    "TrustArc",
    "SpecterOps",
    "BSI RSS-Newsfeed",
    "Infosec Institute (malware analysis)",
    "Infosec Institute (news)",
    "Infosec Institute (threat intelligence)",
    "Naked Security (Sophos)",
]

def remove_feed_entry(content, feed_name):
    """Remove a feed entry (both active and commented) from the content"""
    
    # Pattern to match both active and commented feed entries
    # Matches from the opening brace to the closing brace and comma
    patterns = [
        # Active entry pattern
        rf'\s*{{\s*\n\s*name:\s*"{re.escape(feed_name)}",.*?\n\s*}},?\n',
        # Commented entry pattern (with comment before)
        rf'\s*//.*?\n\s*//\s*{{\s*\n\s*//\s*name:\s*"{re.escape(feed_name)}",.*?\n\s*//\s*}},?\n',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.DOTALL)
    
    return content

def main():
    file_path = "/Users/achuth/Projects/ThreatIntelDigest/client/src/lib/rss-sources.ts"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_length = len(content)
    
    # Remove each feed
    for feed_name in FEEDS_TO_REMOVE:
        content = remove_feed_entry(content, feed_name)
    
    # Clean up any double empty lines
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Removed {len(FEEDS_TO_REMOVE)} feeds")
    print(f"File size reduced from {original_length} to {len(content)} bytes")
    print(f"Reduction: {original_length - len(content)} bytes")

if __name__ == "__main__":
    main()
