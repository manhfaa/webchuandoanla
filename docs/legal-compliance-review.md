# Legal review before publication

The bilingual Terms and Privacy Policy were revised on 2026-11-06. This is a
technical/content review, not a legal opinion. Do not describe the website as
fully compliant until the items below are verified by the operator and a
Vietnamese lawyer.

## Information the operator must supply

- Identify the actual person, household business or company receiving payments.
  Verify the legal name, registration/tax details where applicable, business
  address and support contact before adding them to Terms, Support and checkout.
  DIEPTEK is presently described as a development team, not a verified legal entity.
- Determine whether the paid website and developer API require e-commerce
  notification under the 2025 E-commerce Law and implementing rules. Keep the
  filing/confirmation evidence; do not display a notification badge until issued.
- Map each provider's actual data fields, purposes and server regions (including
  Supabase, Vercel, Hugging Face, DeepSeek, Tavily, Google and SePay). Assess
  whether processing and cross-border impact dossiers are required, and retain
  submission evidence if applicable.
- Approve a concrete retention/deletion schedule for diagnosis images, account
  data, payment records, webhook audit data and analytics. The current policy
  cannot state precise durations without that operational decision.
- Have counsel review the final Vietnamese and English terms, especially refund
  handling, consumer complaints, pre-paid API balances and any age/guardian flow.

## Technical controls now in the codebase

- Optional Google Analytics is not loaded before an explicit browser choice;
  refusal does not block the service. Microsoft Clarity is not mounted.
- Analytics choice is stored in the browser with a timestamp. This is not a
  server-side consent audit trail and does not prove consent on other devices.
- The SePay webhook keeps an allowlist of reconciliation fields instead of
  persisting every provider field. Existing historical rows are not rewritten.

Before re-enabling session recording or changing analytics providers, perform a
new privacy review and bump the browser consent storage key.
