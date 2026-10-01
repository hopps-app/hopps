#!/bin/bash

# Define a key-value map for search and replace strings
declare -A STRING_MAP
STRING_MAP["VITE_TITLE_VALUE"]=$VITE_TITLE
STRING_MAP["VITE_GENERAL_DATE_FORMAT_VALUE"]=$VITE_GENERAL_DATE_FORMAT
STRING_MAP["VITE_OIDC_PROVIDER_URL_VALUE"]=$VITE_OIDC_PROVIDER_URL
STRING_MAP["VITE_OIDC_CLIENT_ID_VALUE"]=$VITE_OIDC_CLIENT_ID
# Optional. The default lives here: the minifier folds the SPA's own fallback into the placeholder at build time,
# so an empty value would reach the browser as an empty scope.
STRING_MAP["VITE_OIDC_SCOPE_VALUE"]=${VITE_OIDC_SCOPE:-openid profile email}
STRING_MAP["VITE_API_ORG_URL_VALUE"]=$VITE_API_ORG_URL
STRING_MAP["VITE_API_FIN_URL_VALUE"]=$VITE_API_FIN_URL

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