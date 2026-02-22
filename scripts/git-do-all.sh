#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_BRANCH="main"
DEFAULT_MSG="chore: sync all local changes"
COMMIT_MSG="${1:-$DEFAULT_MSG}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not a git repository"
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
  echo "Switching branch: $CURRENT_BRANCH -> $TARGET_BRANCH"
  git checkout "$TARGET_BRANCH"
fi

echo "Fetching remote refs..."
if ! git fetch origin >/dev/null 2>&1; then
  echo "Warning: could not fetch origin (network/DNS/auth issue). Continuing with local push attempt."
fi

echo "Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes to commit."
else
  echo "Creating commit: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG"
fi

echo "Pushing to origin/$TARGET_BRANCH ..."
if git push origin "$TARGET_BRANCH"; then
  echo "Push successful."
else
  echo "Push failed. Check network, DNS, or git auth." >&2
  exit 1
fi
