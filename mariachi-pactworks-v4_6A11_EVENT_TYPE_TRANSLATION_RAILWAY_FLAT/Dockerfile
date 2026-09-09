FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json ./
COPY scripts ./scripts
COPY site ./site
RUN npm run build && npm run verify && npm run secret-scan && npm run secret-scan:dist

FROM node:22-alpine
WORKDIR /app
COPY server.mjs ./server.mjs
COPY --from=build /workspace/dist /srv
ENV PORT=3000
ENV SITE_ROOT=/srv
ENV SUPABASE_URL=https://rssklnlnztiktldxmyxl.supabase.co
ENV SUPABASE_PUBLISHABLE_KEY=""
ENV SUPABASE_SERVICE_ROLE_KEY=""
ENV PACTWORKS_ORG_ID=""
ENV PUBLIC_SITE_URL=""
ENV RESEND_API_KEY=""
ENV CONTRACT_EMAIL_FROM=""
ENV PACTWORKS_DB_SCHEMA=pactworks
EXPOSE 3000
CMD ["node","server.mjs"]
