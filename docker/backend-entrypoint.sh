#!/bin/sh
set -eu

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting CampusOS API..."
exec node apps/backend/src/index.js
