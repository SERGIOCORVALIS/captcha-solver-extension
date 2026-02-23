#!/usr/bin/env bash
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"

if ! git remote get-url origin >/dev/null 2>&1; then
  cat <<MSG
[ERROR] Remote 'origin' is not configured.
Run one of:
  scripts/setup-origin.sh https://github.com/<user>/<repo>.git
  GIT_REMOTE_URL=https://github.com/<user>/<repo>.git scripts/setup-origin.sh
MSG
  exit 1
fi

# Ensure there is at least one commit to push
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "[ERROR] No commits found in this repository."
  exit 1
fi

remote_url="$(git remote get-url origin)"
echo "[INFO] Pushing branch '$branch' to origin ($remote_url)"
git push -u origin "$branch"
echo "[OK] Push completed."
