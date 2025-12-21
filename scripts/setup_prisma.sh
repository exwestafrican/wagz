#!/bin/bash
set -e  # Exit on error

# Check if .env file exists
if [ -f .env ]; then
    # Source the .env file to load variables
    source .env
else
    echo "Warning: .env file not found. Environment variables might not be loaded."
fi


echo "Setting up Prisma user..."


psql "$POSTGRES_USER" <<EOF
    DO
    \$do\$
    BEGIN
    IF NOT EXISTS ( SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'prisma') THEN
        CREATE USER "prisma" WITH PASSWORD '$DB_PASSWORD' BYPASSRLS CREATEDB;
    END IF;
    END
    \$do\$;



    -- Makes standard postgres user a member of the prisma group
    GRANT "prisma" TO "postgres";

    -- Granting permissions on the schema
    GRANT USAGE ON SCHEMA PUBLIC TO prisma;
    GRANT CREATE ON SCHEMA PUBLIC TO prisma;

    -- Grant Prisma full privileges on all existing tables, routines, and sequences

    GRANT all ON all tables IN SCHEMA public TO prisma;
    GRANT all ON all routines IN SCHEMA public TO prisma;
    GRANT all ON all sequences IN SCHEMA public TO prisma;

    -- Automatically grant Prisma privileges on all future objects created by postgres
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON tables TO prisma;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON routines TO prisma;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON sequences TO prisma;
EOF


# Define colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo -e "${YELLOW}${BOLD}⚠️  MANUAL STEP REQUIRED${NC}"
echo "================================================"
echo ""
echo -e "${BOLD}${RED}Due to Supabase setup, you will need to manually grant prisma's privileges to postgres by adding postgres to the prisma group.${NC}"
echo ""
echo -e "${BLUE}To add postgres to the prisma group:${NC}"
echo -e "${GREEN}  1. Go to: http://127.0.0.1:54323/project/default/sql/${NC}"
echo -e "${GREEN}  2. Run command: GRANT prisma TO postgres;${NC}"
echo ""
echo "================================================"
echo ""
