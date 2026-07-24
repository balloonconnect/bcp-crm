#!/usr/bin/env bash
# "Secret scanning" — a plain, dependency-free pattern scanner for the
# common shapes real secrets take (AWS keys, private key blocks,
# Anthropic/API-style bearer tokens, generic high-entropy assignments
# to *_KEY/*_SECRET/*_TOKEN/*_PASSWORD variables). This is deliberately
# not a replacement for a dedicated tool like gitleaks or trufflehog —
# see docs/security-guide.md for the recommended CI setup — but it's a
# real, runnable check for local development and any CI environment
# without one of those tools installed, rather than a checklist item
# with nothing behind it.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PATTERNS=(
  'AKIA[0-9A-Z]{16}'                      # AWS access key ID
  '-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----'
  'sk-ant-[a-zA-Z0-9_-]{20,}'              # Anthropic-style API key
  '(api|secret)_?key["\x27]?\s*[:=]\s*["\x27][a-zA-Z0-9_\-]{20,}["\x27]'
  '[a-zA-Z0-9_]*(PASSWORD|SECRET|PRIVATE_KEY)["\x27]?\s*[:=]\s*["\x27][^"\x27]{8,}["\x27]'
)

EXCLUDE_DIRS='node_modules|\.next|\.turbo|dist|coverage|\.git'
FOUND=0

for pattern in "${PATTERNS[@]}"; do
  matches=$(grep -rEn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.json' --include='*.env*' \
    -e "$pattern" . 2>/dev/null | grep -Ev "$EXCLUDE_DIRS" | grep -Ev '\.example$|\.test\.|__tests__' || true)
  if [ -n "$matches" ]; then
    echo "⚠ Potential secret matching pattern: $pattern"
    echo "$matches"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "No obvious secret patterns found."
else
  echo ""
  echo "Review the matches above. A .env.example placeholder or a test fixture is expected to trip some patterns — that's a false positive, not a finding."
  exit 1
fi
