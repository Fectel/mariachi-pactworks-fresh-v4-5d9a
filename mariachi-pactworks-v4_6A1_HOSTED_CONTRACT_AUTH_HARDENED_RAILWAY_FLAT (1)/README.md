# Mariachi PactWorks — Fresh Railway Build v4.5D9A

This repository is intentionally FLAT and ready for a brand-new GitHub repository.

## Railway

Connect Railway to this GitHub repository.

**Root Directory: leave BLANK.**

Do not enter the repository name in Root Directory.

Builder:
- Dockerfile / automatic Docker detection

Custom Build Command:
- leave blank

Custom Start Command:
- leave blank

## Repository root

The repository root directly contains:

- Dockerfile
- Caddyfile
- docker-entrypoint.sh
- package.json
- package-lock.json
- site/
- scripts/
- .github/

There is no wrapper folder and no Nixpacks configuration.

## Current public behavior

- Public pricing page
- Simple bilingual Quote / Inquiry path
- Advanced Check Availability is OFF by default
- Admin can enable public scheduling from Public portal connection settings
- Google/Email public auth code is preserved
- Public scheduling uses the Schedule & Quotes donor when enabled

## Environment variables

Optional Railway variables:

- GOOGLE_MAPS_BROWSER_KEY
- PUBLIC_REQUEST_API_URL

Do not put Stripe secret keys in this browser-facing site.

## Local verification

```bash
npm ci
npm test
```

The Docker build also runs build, verify, and secret scans before producing the Caddy runtime image.
