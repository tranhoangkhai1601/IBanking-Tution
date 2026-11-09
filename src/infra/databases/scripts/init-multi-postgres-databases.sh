#!/usr/bin/env bash
set -e

function create_database() {
    database=$1
    user=$2
    echo "Creating database '$database' for user '$user'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE DATABASE "$database";
        GRANT ALL PRIVILEGES ON DATABASE "$database" TO "$user";
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple databases requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        db_name=$db
        user=$POSTGRES_USER
        pswd=$POSTGRES_PASSWORD
        if [[ -z "$pswd" ]]
        then
            pswd=$user
        fi

        echo "user is $user"
        create_database $db $user
    done
fi