#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Backward-compatible wrapper for legacy Claude-only installer.
"$SCRIPT_DIR/install-ups.sh" --runtime claude --scope local --source local --yes

echo ""
echo "Legacy installer completed via install-ups.sh (runtime=claude, scope=local)."
