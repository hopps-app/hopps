#!/bin/bash

# Define a key-value map for search and replace strings
declare -A STRING_MAP
STRING_MAP["VITE_TITLE"]=$VITE_TITLE
STRING_MAP["VITE_GENERAL_DATE_FORMAT"]=$VITE_GENERAL_DATE_FORMAT
STRING_MAP["VITE_GENERAL_CURRENCY_SYMBOL_AFTER"]=$VITE_GENERAL_CURRENCY_SYMBOL_AFTER
STRING_MAP["VITE_KEYCLOAK_URL"]=$VITE_KEYCLOAK_URL
STRING_MAP["VITE_KEYCLOAK_REALM"]=$VITE_KEYCLOAK_REALM
STRING_MAP["VITE_KEYCLOAK_CLIENT_ID"]=$VITE_KEYCLOAK_CLIENT_ID
STRING_MAP["VITE_API_URL"]=$VITE_API_URL

# Specify the relative directory where you want to perform the replacement
RELATIVE_DIRECTORY="./build"

# Iterate over the keys in the associative array and perform replacements
for SEARCH_STRING in "${!STRING_MAP[@]}"; do
    REPLACE_STRING="${STRING_MAP[$SEARCH_STRING]}"

    echo "REPLACING all $SEARCH_STRING with $REPLACE_STRING."
    # Find text files and replace the string
    find "$RELATIVE_DIRECTORY" -type f -exec grep -q "$SEARCH_STRING" {} \; -exec sed -i "s#$SEARCH_STRING#$REPLACE_STRING#g" {} \; -exec echo "Replaced in file: {}" \;
done

echo "Replacement complete."