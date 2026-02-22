#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"

failures=0
warns=0

ok() { echo "[OK] $1"; }
warn() { echo "[WARN] $1"; warns=$((warns+1)); }
fail() { echo "[FAIL] $1"; failures=$((failures+1)); }

if [[ ! -f "$MANIFEST" ]]; then
  echo "manifest.json missing"
  exit 1
fi

required_files=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$MANIFEST','utf8'));for(const f of p.required_files) console.log(f);")
expected_skill_count=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$MANIFEST','utf8'));process.stdout.write(String(p.skill_count));")

while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  if [[ -e "$SCRIPT_DIR/$rel" ]]; then
    ok "required file present: $rel"
  else
    fail "required file missing: $rel"
  fi
done <<< "$required_files"

if [[ -d "$SCRIPT_DIR/.claude/skills/pattern-space" ]]; then
  actual_count=$(find "$SCRIPT_DIR/.claude/skills/pattern-space" -name SKILL.md | wc -l | tr -d ' ')
  if [[ "$actual_count" == "$expected_skill_count" ]]; then
    ok "skill count matches manifest ($actual_count)"
  else
    fail "skill count mismatch: manifest=$expected_skill_count actual=$actual_count"
  fi
else
  fail "missing .claude/skills/pattern-space source tree"
fi

if find "$SCRIPT_DIR/6-recognition" -maxdepth 1 -type f -name '.!*' | grep -q .; then
  fail "temporary duplicate files found in 6-recognition/.!*. Remove them."
else
  ok "no temporary duplicate files in 6-recognition"
fi

if LC_ALL=C awk '/[[:cntrl:]]/ { print FILENAME":"NR; exit 1 }' "$SCRIPT_DIR/6-recognition/README.md" >/dev/null 2>&1; then
  ok "6-recognition/README.md has no control characters"
else
  fail "6-recognition/README.md contains control characters"
fi

forbidden_patterns=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$MANIFEST','utf8'));for(const s of p.forbidden_patterns) console.log(s);")
while IFS= read -r pat; do
  [[ -z "$pat" ]] && continue
  if rg -n --fixed-strings "$pat" "$SCRIPT_DIR" \
    -g '!**/.git/**' \
    -g '!manifest.json' \
    -g '!verify-ups.sh' >/dev/null 2>&1; then
    fail "forbidden pattern found: $pat"
  else
    ok "forbidden pattern absent: $pat"
  fi
done <<< "$forbidden_patterns"

if rg -n '\]\(/core/' "$SCRIPT_DIR" \
  -g '!**/.git/**' \
  -g '!manifest.json' \
  -g '!verify-ups.sh' >/dev/null 2>&1; then
  fail "obsolete /core/ markdown links found"
else
  ok "no obsolete /core/ markdown links"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "Verification failed with $failures failure(s), $warns warning(s)."
  exit 1
fi

echo "Verification passed with $warns warning(s)."
