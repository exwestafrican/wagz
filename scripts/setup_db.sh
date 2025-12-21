#!/bin/bash

# Check if .env file exists
if [ -f .env ]; then
    # Source the .env file to load variables
    source .env
else
    echo "Warning: .env file not found. Environment variables might not be loaded."
fi

set -o allexport  # Automatically export all variables
source .env
set +o allexport  # Disable automatic exporting


echo "Creating user $DB_USER..."

psql postgres <<EOF
DO
\$do\$
BEGIN
   IF NOT EXISTS ( SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
      CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
   END IF;
END
\$do\$;
EOF
echo "Creating Db: $DB_NAME"

createdb -O $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists."

echo "Granting privileges..."

psql postgres <<EOF
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER
EOF

echo "Done!"
