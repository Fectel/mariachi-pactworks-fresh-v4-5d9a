# PactWorks v4.6A7 — Post-Sign Print + Editable Required Deposit

No Supabase schema migration is required.

- Print / Save is hidden before signature.
- After successful hosted signing, the client sees **📄 Print / Save Signed Contract**.
- The button remains available on future visits once signed.

Required deposit is now editable from the admin contract after creation.

Unsigned hosted version:
- updates local deposit and balance
- updates hosted contract payload
- records `required_deposit_updated`

Signed hosted version:
- never rewrites the signed agreement
- updates local operational deposit
- increments hosted signing version
- clears old local link pointer
- requires a fresh signing link
