# RevenueCat

Studilly uses RevenueCat for subscriptions. **This build is wired to the
RevenueCat Test Store: purchases are simulated, no payment details are
collected and no money moves.**

## What is already configured

Against the RevenueCat project `Studilly` (`c1cc9e0f`):

**Products** (Test Store)

| Identifier | Duration | Price |
| --- | --- | --- |
| `studilly_pro_monthly` | Monthly | 8.99 |
| `studilly_pro_yearly` | Yearly | 71.88 |
| `studilly_ultra_monthly` | Monthly | 17.99 |
| `studilly_ultra_yearly` | Yearly | 143.88 |

**Entitlements**

| Identifier | Products |
| --- | --- |
| `studilly_pro` | pro monthly, pro yearly |
| `studilly_ultra` | ultra monthly, ultra yearly |

**Offerings**, one per paid tier, each with the standard package identifiers so
the SDK can resolve them:

| Offering | `$rc_monthly` | `$rc_annual` |
| --- | --- | --- |
| `pro` | `studilly_pro_monthly` | `studilly_pro_yearly` |
| `ultra` | `studilly_ultra_monthly` | `studilly_ultra_yearly` |

**Keys**

- Test Store public key (`test_...`) in `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY`.
  The `test_` prefix is what makes the SDK open a simulated checkout instead of
  a real payment sheet.
- A V2 secret key scoped to **customer information: read only**, in
  `REVENUECAT_SECRET_KEY`. Least privilege: the server only ever needs to read
  entitlements, so the key cannot write anything.

All of this mirrors `src/config/plans.ts`, which is the single source of truth
for prices, limits and identifiers.

## How a purchase flows

1. The student picks a plan. `PlanPicker` loads `@revenuecat/purchases-js`
   lazily and calls `getOfferings()`, then `purchase({ rcPackage })`.
2. RevenueCat shows its Test Store modal. The student confirms; no card, no
   charge.
3. The client calls `POST /api/subscription/sync`.
4. **The server asks RevenueCat directly** via REST v2
   (`/v2/projects/{id}/customers/{app_user_id}/active_entitlements`) and writes
   the resulting plan to `subscriptions`.

Step 4 is the important one. The client reports that something happened; it
never says which plan to grant. `subscriptions` has no client write policy, so
a modified browser cannot promote itself.

## Sandbox behaviour

Test Store subscriptions renew on an accelerated schedule (a monthly plan
renews every few minutes) and expire after about five renewals, which is what
makes renewal and expiry logic testable in one sitting.

`subscriptions.is_sandbox` is `true` for everything in this build, and both the
pricing page and the subscription page say so in plain language.

## Simulation mode

With `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` empty, the app runs plan changes
through `POST /api/subscription/simulate`, so plan-gated features can be
exercised without any RevenueCat setup. The UI labels this clearly.

`simulatePlanChange` throws if `REVENUECAT_SECRET_KEY` and
`REVENUECAT_PROJECT_ID` are both set, and the route returns 503. Simulation
therefore cannot become a way to grant a paid plan once billing is real.

## Webhook

`POST /api/revenuecat/webhook` keeps plans in step with renewals,
cancellations, expiries and billing issues.

Configure it in RevenueCat under Integrations once the app has a public URL:

- URL: `https://<your-domain>/api/revenuecat/webhook`
- Authorization header: the same value as `REVENUECAT_WEBHOOK_SECRET`

The handler compares the header in constant time and **fails closed**: an unset
secret means every request is refused, rather than every request accepted.
Unrecognised payload shapes are acknowledged rather than rejected, so a future
RevenueCat field addition cannot start dropping renewals.

Until a public URL exists, entitlements stay correct through the sync call
after purchase and on each visit to the subscription page.

## Going to production

1. Connect a real store (RevenueCat Billing via Stripe, or App Store / Play).
2. Recreate the four products there with the same identifiers, and attach them
   to the existing entitlements.
3. Swap `NEXT_PUBLIC_REVENUECAT_PUBLIC_KEY` for the production public key.
   Nothing else in the application changes: `plans.ts` already holds the
   identifiers and `SubscriptionService` already verifies server-side.
4. Set `is_sandbox` correctly. The webhook already derives it from the event's
   `environment` field; the post-purchase sync path hard-codes `true` and needs
   one line changed when production purchases become possible.
5. Add the withdrawal notice and billing terms flagged in `agb/page.tsx`.
6. Point the webhook at the production URL and rotate the shared secret.

## Current limitations

- The post-purchase sync path always records `is_sandbox = true`, because this
  build cannot produce a production purchase. One line in
  `SubscriptionService.writePlan`.
- Prices shown come from `src/config/plans.ts` rather than from RevenueCat.
  The Test Store products carry USD amounts, while Studilly is priced in EUR
  for a German audience. In production the display price should come from the
  offering so it matches what the store actually charges.
- Proration and mid-cycle plan changes are left to RevenueCat's own handling.
