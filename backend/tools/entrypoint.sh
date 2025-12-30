#!/bin/sh
set -e

echo "Waiting for database..."

# optional but strongly recommended
until npx prisma db execute --stdin <<EOF
SELECT 1;
EOF
do
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec "$@"
