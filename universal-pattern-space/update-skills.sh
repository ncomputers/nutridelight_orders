#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Backward-compatible wrapper for legacy Claude-only updater.
"$SCRIPT_DIR/update-ups.sh" --runtime claude --scope local --source local --yes

echo ""
echo "Legacy updater completed via update-ups.sh (runtime=claude, scope=local)."
