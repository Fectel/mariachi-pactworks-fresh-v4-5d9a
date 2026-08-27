#!/bin/sh
set -eu
rm -rf /srv
mkdir -p /srv
cp -R /srv-template/. /srv/
for file in $(find /srv -type f -name '*.html'); do tmp="${file}.tmp"; envsubst '$GOOGLE_MAPS_BROWSER_KEY $PUBLIC_REQUEST_API_URL' < "$file" > "$tmp"; mv "$tmp" "$file"; done
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
