# PactWorks v4.6A5 — Mature Hosted Contract UI

No database migration is required.

The hosted `/sign/<token>` page now reuses the mature signing/payment concepts from the
legacy PactWorks standalone signing component instead of presenting a stripped-down form.

## Payment workflow
- Admin's required deposit remains the minimum.
- Customer can use a slider + number field to pay:
  - exactly the required deposit,
  - any larger amount up to the total,
  - or the full amount.
- Quick buttons select Required deposit or Pay in full.
- Customer payment method remains Zelle only.
- Zelle recipient, handle, memo, and business phone are clearly displayed.
- Customer is explicitly told to take a screenshot of the Zelle confirmation and text it
  back to the business phone.
- SMS button opens the phone's text app where supported.
- Screenshot/confirmation remains evidence only and does NOT reserve the date.
- Admin must still verify the actual Zelle payment before reservation.

## Signing workflow
- 3-step guidance: Review -> Sign -> Zelle + screenshot.
- Reservation warning is repeated at the appropriate points.
- Existing hosted token/database architecture and offline legacy fallback are preserved.
