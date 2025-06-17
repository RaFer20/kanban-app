#!/bin/bash

echo "Waiting for PostgreSQL to be ready..."

while ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; do
  sleep 1
done

echo "Postgres is up, checking if database '$POSTGRES_DB' exists..."

until PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -U $POSTGRES_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$POSTGRES_DB'" | grep -q 1; do
  echo "Database $POSTGRES_DB is not created yet. Waiting..."
  sleep 1
done

echo "Database $POSTGRES_DB exists, running migrations..."

alembic upgrade head

echo "Starting FastAPI app..."

exec poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000

