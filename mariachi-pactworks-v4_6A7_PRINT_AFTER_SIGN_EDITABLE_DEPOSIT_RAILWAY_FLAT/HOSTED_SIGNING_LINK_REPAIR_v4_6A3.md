# PactWorks v4.6A3 — Hosted Signing Link Repair

No database migration required.

- Compact contract rows now use **Create signing link** / **Copy signing link** and **Open signing page**.
- The legacy Export/Import signing-file workflow remains only as an offline fallback in More actions.
- Same-version hosted-link refresh compares substantive frozen contract content while ignoring only `issuedAt`, which is regenerated on every browser build.
- A real contract change still requires a new contract version.
- Existing unsigned hosted rows whose local raw token was lost can now safely receive a refreshed secure token.
- The admin-only 3-mariachi × 1-hour rule from v4.6A2 is preserved.
