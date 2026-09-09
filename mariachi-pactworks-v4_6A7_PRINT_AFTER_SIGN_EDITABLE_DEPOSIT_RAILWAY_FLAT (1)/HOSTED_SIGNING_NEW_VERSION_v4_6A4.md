# PactWorks v4.6A4 — New Signing Version Recovery

No Supabase migration is required.

This patch addresses older contracts that already have a hosted-contract row created
before the current web-signing workflow.

## New action
**New signing version**

This does NOT duplicate the booking. It preserves:
- contract/booking ID
- client
- event date/time/location
- price and discounts
- payments
- client credit
- reservation state
- operational history

It only:
- increments a dedicated hosted signing version
- clears the obsolete local hosted-link pointer
- creates a fresh secure `/sign/<token>` link

## Recovery UX
If hosted-link creation returns an old-version/payload conflict, PactWorks now offers
to create the new signing version immediately.

This is safer than cloning the entire contract because cloning could create duplicate
bookings, payments, or reservation conflicts.
