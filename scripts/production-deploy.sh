#!/usr/bin/env bash

# Runs on the EC2 production host after the workflow has checked out IMAGE_TAG.
set -Eeuo pipefail

app_dir="${APP_DIR:-/app/spendsense}"
state_dir="$app_dir/.deploy-state"
min_available_kib="${MIN_AVAILABLE_KIB:-1572864}"
max_disk_percent="${MAX_DISK_PERCENT:-80}"
max_inode_percent="${MAX_INODE_PERCENT:-80}"

require_value() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required deployment environment variable: $name" >&2
    exit 2
  fi
}

disk_value() {
  df -Pk / | awk 'NR == 2 {gsub(/%/, "", $5); print $5}'
}

inode_value() {
  df -Pi / | awk 'NR == 2 {gsub(/%/, "", $5); print $5}'
}

available_kib() {
  df -Pk / | awk 'NR == 2 {print $4}'
}

for name in GHCR_OWNER GHCR_READ_TOKEN GITHUB_ACTOR IMAGE_TAG; do
  require_value "$name"
done

cd "$app_dir"
mkdir -p "$state_dir"
cp scripts/production-mark-success.sh "$state_dir/production-mark-success.sh"

if [[ "$(git rev-parse HEAD)" != "$IMAGE_TAG" ]]; then
  echo 'Refusing deployment: checked-out repository commit does not match IMAGE_TAG.' >&2
  exit 1
fi

disk_percent="$(disk_value)"
inode_percent="$(inode_value)"
free_kib="$(available_kib)"
echo "Disk preflight: root=${disk_percent}% used, inodes=${inode_percent}% used, ${free_kib} KiB free"

if (( disk_percent >= max_disk_percent )); then
  echo "Refusing deployment: root disk use is at or above ${max_disk_percent}%." >&2
  exit 1
fi
if (( inode_percent >= max_inode_percent )); then
  echo "Refusing deployment: inode use is at or above ${max_inode_percent}%." >&2
  exit 1
fi
if (( free_kib < min_available_kib )); then
  echo "Refusing deployment: less than ${min_available_kib} KiB is available for the candidate image set." >&2
  exit 1
fi

current_image="$(docker inspect --format '{{.Config.Image}}' spendsense_backend 2>/dev/null || true)"
current_sha="${current_image##*:}"
if [[ "$current_image" == ghcr.io/*/spendsense-backend:* && "$current_sha" != 'latest' ]]; then
  printf '%s\n' "$current_sha" > "$state_dir/previous-successful-sha"
fi

echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
GHCR_OWNER="$GHCR_OWNER" IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml pull
GHCR_OWNER="$GHCR_OWNER" IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml up --detach --remove-orphans
GHCR_OWNER="$GHCR_OWNER" IMAGE_TAG="$IMAGE_TAG" docker compose -f docker-compose.prod.yml ps

disk_percent="$(disk_value)"
inode_percent="$(inode_value)"
free_kib="$(available_kib)"
echo "Disk postflight: root=${disk_percent}% used, inodes=${inode_percent}% used, ${free_kib} KiB free"
