# Developer API release checklist

All developer API flags default to false. The frontend navigation also requires `NEXT_PUBLIC_DEVELOPER_API_ENABLED=true` at build time. Do not switch on real top-ups until the entire checklist is met.

- Run migrations and verify PostgreSQL is used. Never use SQLite for paid requests.
- Verify the configured inference provider with real images, timeouts and failures. The current backend validates file format and dimensions, but does not independently verify that a valid image actually contains a leaf. Do not promise otherwise.
- Arrange for `manage.py run_housekeeping` or `manage.py release_stale_api_reservations` to run at least every few minutes and monitor failures. The code does not install a scheduler by itself.
- Verify webhook signature validation, bank-account matching, duplicate delivery, excess, partial and late transfers with the actual SePay configuration without interrupting existing subscription payments.
- Verify payment reconciliation operational access and train an administrator to review discrepancies. A paid order receiving an additional transfer is put into review, and only the uncredited difference can be credited.
- Verify API throttling at the edge, database concurrency tests, HTTPS, key revocation, retention, monitoring and account ownership checks. Keep all keys server-side.
- Test the dashboard in both themes and on mobile, including restoring a pending order after refresh, and verify QR destinations and account details.
- Perform a controlled real transfer only after the user personally authorizes and makes it. Verify exactly one ledger credit, successful paid inference, one debit, duplicate retry behavior and all failure refunds.
- Deploy behind the default-off switches first, then enable only after all checks are complete and an explicit launch decision is made. A deployment, passing mocked tests or a SePay webhook being enabled does not mean real payments are ready.
