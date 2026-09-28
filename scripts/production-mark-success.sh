#!/usr/bin/env bash

# Runs on the EC2 production host only after public readiness succeeds.
set -Eeuo pipefail

app_dir="${APP_DIR:-/app/spendsense}"
state_dir="$app_dir/.deploy-state"
image_tag="${1:?Usage: production-mark-success.sh <immutable-git-sha>}"

cd "$app_dir"
mkdir -p "$state_dir"

previous_sha=""
if [[ -f "$state_dir/previous-successful-sha" ]]; then
  previous_sha="$(<"$state_dir/previous-successful-sha")"
fi

printf '%s\n' "$image_tag" > "$state_dir/current-successful-sha"
printf '%s %s\n' "$(date --iso-8601=seconds)" "$image_tag" >> "$state_dir/history.log"

if [[ -n "$previous_sha" && "$previous_sha" != "$image_tag" ]]; then
  GHCR_OWNER="${GHCR_OWNER:?GHCR_OWNER is required}" \
    docker image rm \
      "ghcr.io/${GHCR_OWNER}/spendsense-backend:${previous_sha}" \
      "ghcr.io/${GHCR_OWNER}/spendsense-ai:${previous_sha}" || true
fi

df -h /
docker system df
