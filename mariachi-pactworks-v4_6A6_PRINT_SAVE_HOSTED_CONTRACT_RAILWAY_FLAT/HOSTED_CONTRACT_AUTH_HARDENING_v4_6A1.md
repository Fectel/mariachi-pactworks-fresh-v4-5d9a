# PactWorks v4.6A1 — Hosted Contract Authorization Hardening

Supabase activation is complete on project `rssklnlnztiktldxmyxl`.

This package makes no database schema changes beyond retaining the already-applied v4.6A migration file for source/history.

## Fixes

- Admin API access now requires an authenticated Supabase user who is also an active PactWorks `owner` or `admin` member of `PACTWORKS_ORG_ID`.
- Zelle verification now looks up the hosted contract by both contract `id` and `PACTWORKS_ORG_ID`.
- Authorization fails closed if PactWorks membership cannot be confirmed.

## Preserved behavior

- secure hashed customer signing tokens
- frozen hosted contract snapshot
- Zelle-only customer payment flow
- customer payment declaration does not reserve the booking
- manual admin Zelle verification is required before reservation
- existing offline `.pactsigned` workflow remains available
