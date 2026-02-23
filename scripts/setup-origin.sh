#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ge 1 ]]; then
  REMOTE_URL="$1"
elif [[ -n "${GIT_REMOTE_URL:-}" ]]; then
  REMOTE_URL="$GIT_REMOTE_URL"
else
  echo "Usage: scripts/setup-origin.sh <git-remote-url>"
  echo "   or: GIT_REMOTE_URL=<git-remote-url> scripts/setup-origin.sh"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
  echo "Updated origin -> $REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
  echo "Added origin -> $REMOTE_URL"
fi

git remote -v
