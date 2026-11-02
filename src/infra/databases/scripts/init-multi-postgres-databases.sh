#!/bin/bash
set -e

function create_database() {
    database = $1
    user = $2
    password = $3
    echo "Creating user and database '$database' with password '$user'"
}
# https://www.youtube.com/watch?v=UVBrRKgnJB4
# Dammmm