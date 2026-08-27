FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json ./
COPY scripts ./scripts
COPY site ./site
RUN npm run build && npm run verify && npm run secret-scan && npm run secret-scan:dist

FROM caddy:2.8-alpine
RUN apk add --no-cache gettext
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /usr/local/bin/mha-entrypoint
RUN chmod +x /usr/local/bin/mha-entrypoint
COPY --from=build /workspace/dist /srv-template
ENV PORT=3000
ENV GOOGLE_MAPS_BROWSER_KEY=""
ENV PUBLIC_REQUEST_API_URL=""
ENTRYPOINT ["/usr/local/bin/mha-entrypoint"]
