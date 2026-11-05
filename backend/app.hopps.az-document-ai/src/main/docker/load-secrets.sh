#!/bin/sh
# Loads passwords and keys from files (e.g. Docker secrets) before starting the application.
#
# For each variable NAME listed in HOPPS_SECRET_VARS, NAME_FILE can specify a file path,
# e.g. /run/secrets/postgres_password. The file content is exported as NAME.
# Empty files are rejected. An empty NAME is treated as unset; setting both NAME and
# NAME_FILE is an error.
# Operators can add names in HOPPS_EXTRA_SECRET_VARS without repeating the defaults.
#
# This script is shared by all Quarkus services. Keep all copies identical.
set -e

for name in $HOPPS_SECRET_VARS ${HOPPS_EXTRA_SECRET_VARS:-}; do
    # Only plain variable names may reach the eval below.
    case "$name" in
        [!A-Za-z_]* | *[!A-Za-z0-9_]*)
            echo "load-secrets: invalid variable name in HOPPS_SECRET_VARS: $name" >&2
            exit 1
            ;;
    esac

    file_var="${name}_FILE"
    eval "file=\${${file_var}:-}"
    [ -n "$file" ] || continue

    eval "value=\${${name}:-}"
    if [ -n "$value" ]; then
        echo "load-secrets: both $name and $file_var are set, use one of them" >&2
        exit 1
    fi
    if [ ! -r "$file" ]; then
        echo "load-secrets: $file_var points to $file, which cannot be read" >&2
        exit 1
    fi

    # $(...) drops trailing newlines, so a file written with echo works too.
    value=$(cat "$file")
    # Most likely a secret that was never filled in. Leave out NAME_FILE for an unused value.
    if [ -z "$value" ]; then
        echo "load-secrets: $file_var points to $file, which is empty" >&2
        exit 1
    fi
    export "$name=$value"
    unset "$file_var"
done

exec "$@"
