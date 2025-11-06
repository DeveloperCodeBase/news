#!/bin/sh
# POSIX sh does not support "pipefail", so we stick to -e (exit on error)
# and -u (treat unset variables as errors) for predictable execution.
set -eu

RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
RUN_SEED="${RUN_SEED:-true}"

if [ "$RUN_MIGRATIONS" = "true" ]; then
  if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    echo "Applying Prisma migrations via migrate deploy..."
    pnpm prisma migrate deploy
  else
    echo "No Prisma migrations detected; syncing schema with db push..."
    pnpm prisma db push
  fi
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "Running Prisma seed..."
  pnpm prisma db seed
fi

echo "Starting command: $*"
exec "$@"
