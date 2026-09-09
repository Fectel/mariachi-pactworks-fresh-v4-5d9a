# PactWorks v4.6A6 — Print / Save Hosted Contract

No Supabase migration is required.

Clients now have a **Print / Save PDF** button on the hosted contract page.

The printable copy reflects the current hosted state, including:
- Awaiting signature
- Signed — payment pending
- Signed — payment sent, awaiting verification
- Reserved — verified payment
- Fully paid

It also includes contract/event details, terms, acceptance state, hosted payment amount/status,
remaining amount when applicable, and reservation status.

Interactive payment controls are hidden in print mode so the saved PDF is a clean record.
