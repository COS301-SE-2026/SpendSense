#!/usr/bin/env bash

# Restores a prior immutable release. The workflow verifies public readiness afterward.
set -Eeuo pipefail

app_dir="${APP_DIR:-/app/spendsense}"
state_dir="$app_dir/.deploy-state"
target_sha="${1:-}"

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required rollback environment variable: $name" >&2
    exit 2
  fi
}

for name in GHCR_OWNER GHCR_READ_TOKEN GITHUB_ACTOR; do
  require_value "$name"
done

if [[ -z "$target_sha" && -f "$state_dir/previous-successful-sha" ]]; then
  target_sha="$(<"$state_dir/previous-successful-sha")"
fi
if [[ -z "$target_sha" ]]; then
  echo 'No previous successful SHA is recorded; rollback cannot continue.' >&2
  exit 1
fi

cd "$app_dir"
mkdir -p "$state_dir"
if [[ -f scripts/production-mark-success.sh ]]; then
  cp scripts/production-mark-success.sh "$state_dir/production-mark-success.sh"
fi

current_image="$(docker inspect --format '{{.Config.Image}}' spendsense_backend 2>/dev/null || true)"
current_sha="${current_image##*:}"
if [[ "$current_image" == ghcr.io/*/spendsense-backend:* && "$current_sha" != "$target_sha" ]]; then
  printf '%s\n' "$current_sha" > "$state_dir/previous-successful-sha"
fi

git fetch origin main --tags
git checkout --detach "$target_sha"
echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
GHCR_OWNER="$GHCR_OWNER" IMAGE_TAG="$target_sha" docker compose -f docker-compose.prod.yml pull
GHCR_OWNER="$GHCR_OWNER" IMAGE_TAG="$target_sha" docker compose -f docker-compose.prod.yml up --detach --remove-orphans
GHCR_OWNER="$GHCR_OWNER" IMAGE_TAG="$target_sha" docker compose -f docker-compose.prod.yml ps
