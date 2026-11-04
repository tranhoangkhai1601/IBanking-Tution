#!/usr/bin/env bash
set -e

function create_database() {
    database = $1
    user = $2
    password = $3
    echo "Creating user and database '$database' with password '$user'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	    CREATE USER docker;
	    CREATE DATABASE docker;
	    GRANT ALL PRIVILEGES ON DATABASE docker TO docker;
    EOSQL
}
# https://www.youtube.com/watch?v=UVBrRKgnJB4
# Dammmm