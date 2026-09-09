# PactWorks v4.6A — Hosted Contract Portal

## What this checkpoint adds
- Hosted `/sign/:token` customer contract page.
- Raw signing token is never stored; only SHA-256 token hash is stored.
- Customer sees a frozen contract snapshot, signs, and can declare Zelle deposit/full payment sent.
- Customer is instructed to text the Zelle screenshot to the business phone.
- Admin can email/create a hosted signing link from the contract.
- Hosted signing automatically updates the hosted contract row.
- Admin can sync hosted status into the encrypted PactWorks vault.
- After bank/Zelle verification, `Verify Zelle & reserve` records the verified payment and confirms/reserves the booking.
- Existing offline `.pactsigned` signing flow remains as fallback.
- No Stripe customer UI.

## Required live activation
The SQL migration in `migrations/20260831_000001_hosted_contract_portal.sql` must be applied to the same Supabase project.

Railway variables required:
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose in browser)
- `PACTWORKS_ORG_ID`
- `PUBLIC_SITE_URL`

For automatic email:
- `RESEND_API_KEY`
- `CONTRACT_EMAIL_FROM`

The `pactworks` schema must be available to the Supabase Data API for the server's service-role requests.
If it is not currently exposed, enable only the `pactworks` schema in Supabase API settings. Do not expose `pactworks_private`.

## Safety
- No changes to Martha's Studio/public relational data.
- No direct anonymous/authenticated table grants.
- Customer token only allows access through the server after token-hash matching.
- Zelle declaration does not reserve a date.
- Only admin bank verification changes payment to verified/reserved.
