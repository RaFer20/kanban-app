#!/bin/bash
set -e

# Split the environment variable into an array
IFS=',' read -ra DBS <<< "$POSTGRES_MULTIPLE_DATABASES"

for db in "${DBS[@]}"; do
  echo "Checking if database $db exists..."
  if psql -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$db"; then
    echo "Database $db already exists, skipping creation."
  else
    echo "Creating database $db"
    createdb -U "$POSTGRES_USER" "$db"
  fi
done
