#!/bin/sh
# Container entrypoint: reads Docker secrets into environment variables, then starts the application.
#
# Docker convention: for a variable VAR, you can set VAR_FILE to the path of a file that holds the value instead,
# e.g. QUARKUS_DATASOURCE_PASSWORD_FILE=/run/secrets/db_password. This script exports VAR with the file's content
# (trailing newlines removed) and unsets VAR_FILE.
#
# Only files under /run/secrets/ are read. That is where Docker and Compose mount secrets, and the restriction keeps
# Quarkus's own *_FILE settings (e.g. QUARKUS_HTTP_SSL_CERTIFICATE_KEY_STORE_FILE=/deployments/tls/keystore.p12)
# working as plain paths.
#
# The same script is in app.hopps.org, app.hopps.zugferd and app.hopps.az-document-ai, because each image is built
# from its own directory. Keep the copies identical.
set -eu

for file_var in $(env | sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*_FILE\)=\/run\/secrets\/.*/\1/p'); do
    var="${file_var%_FILE}"
    # The name came from a line of `env`, which may also be a line inside a multi-line value of another variable.
    path="$(printenv "$file_var")" || continue

    # Empty counts as unset, as in the Postgres image: Compose sets VAR to "" when .env leaves its value empty.
    if [ -n "$(printenv "$var" || true)" ]; then
        echo "entrypoint: both $var and $file_var are set; set only one of them" >&2
        exit 1
    fi
    if [ ! -r "$path" ]; then
        echo "entrypoint: $file_var points to $path, which does not exist or cannot be read" >&2
        exit 1
    fi

    value="$(cat "$path")"
    export "$var=$value"
    unset "$file_var"
    echo "entrypoint: $var read from $path"
done

exec /opt/jboss/container/java/run/run-java.sh "$@"
