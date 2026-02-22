#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RUNTIME=""
SCOPE=""
SOURCE_MODE="local"
ASSUME_YES="false"

usage() {
  cat <<USAGE
Usage: ./update-ups.sh [options]

Options:
  --runtime claude|codex|gemini|all
  --scope local|global
  --source local|remote
  --yes
  -h, --help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime) RUNTIME="${2:-}"; shift 2 ;;
    --scope) SCOPE="${2:-}"; shift 2 ;;
    --source) SOURCE_MODE="${2:-}"; shift 2 ;;
    --yes) ASSUME_YES="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

RUNTIME="${RUNTIME:-all}"
SCOPE="${SCOPE:-local}"

if [[ "$RUNTIME" != "codex" && "$RUNTIME" != "claude" && "$RUNTIME" != "gemini" && "$RUNTIME" != "all" ]]; then
  echo "Invalid runtime: $RUNTIME"
  exit 1
fi
if [[ "$SCOPE" != "local" && "$SCOPE" != "global" ]]; then
  echo "Invalid scope: $SCOPE"
  exit 1
fi
if [[ "$SOURCE_MODE" != "local" && "$SOURCE_MODE" != "remote" ]]; then
  echo "Invalid source: $SOURCE_MODE"
  exit 1
fi

backup_target() {
  local runtime="$1"
  local base

  if [[ "$SCOPE" == "local" ]]; then
    if [[ "$runtime" == "codex" ]]; then
      base="$PWD/.codex/skills"
    elif [[ "$runtime" == "gemini" ]]; then
      base="$PWD/.gemini/skills"
    else
      base="$PWD/.claude/skills"
    fi
  else
    if [[ "$runtime" == "codex" ]]; then
      base="$HOME/.codex/skills"
    elif [[ "$runtime" == "gemini" ]]; then
      base="$HOME/.gemini/skills"
    else
      base="$HOME/.claude/skills"
    fi
  fi

  if [[ -d "$base/pattern-space" ]]; then
    local ts
    ts=$(date +%Y%m%d_%H%M%S)
    mv "$base/pattern-space" "$base/pattern-space.backup.$ts"
    echo "Backed up [$runtime] -> $base/pattern-space.backup.$ts"
  else
    echo "No existing [$runtime] install found at $base/pattern-space"
  fi
}

echo "Updating UPS..."
case "$RUNTIME" in
  codex) backup_target "codex" ;;
  claude) backup_target "claude" ;;
  gemini) backup_target "gemini" ;;
  all)
    backup_target "codex"
    backup_target "claude"
    backup_target "gemini"
    ;;
  *) echo "Invalid runtime: $RUNTIME"; exit 1 ;;
esac

install_cmd=( "$SCRIPT_DIR/install-ups.sh" --runtime "$RUNTIME" --scope "$SCOPE" --source "$SOURCE_MODE" )
if [[ "$ASSUME_YES" == "true" ]]; then
  install_cmd+=( --yes )
fi
"${install_cmd[@]}"
"$SCRIPT_DIR/verify-ups.sh"

echo "Update complete."
