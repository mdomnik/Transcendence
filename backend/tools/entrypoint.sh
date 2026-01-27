#!/bin/sh
set -e

# Ensure env exists
: "${DATABASE_URL:?DATABASE_URL is not set}"

echo "Waiting for database..."
until echo "SELECT 1;" | npx prisma db execute --stdin
do
  sleep 2
done

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec "$@"
