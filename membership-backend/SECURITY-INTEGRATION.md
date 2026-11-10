# Membership backend deployment and security checklist

**Not a complete Firebase rules file.** `database-rules-fragment.json` is a proposed fragment to merge into the **existing** production Realtime Database rules, not a replacement. Never deploy the fragment alone: doing so could deny access to the rest of the app.

## Database paths

- `membershipApplicationIntake/{uid}`: private application and payment-verification data. Firebase Admin SDK only; no client reads/writes.
- `membershipEntitlements/{uid}`: private authoritative entitlement records. Firebase Admin SDK only; no client reads/writes.
- `publicSupporterProfiles/{uid}` and `memberBadges/{uid}`: retain existing rules and earned badges; do not replace them.

Realtime Database rules are not conventional firewall rules: **a permissive ancestor `.read` or `.write` overrides a restrictive descendant**. Before deployment, inspect all ancestor permissions including the root `rules` node. A child `false` cannot revoke a parent `true`. This fragment is secure only if ancestor rules do not grant client access to these paths.

## Required server integration

1. Locate the **actual deployed** Firebase Functions project and its `functions/index.js`, package dependencies and deployed rules.
2. Copy the membership backend modules into that Functions source and register callables. Do not assume this GitHub Pages repository is the Functions deployment source.
3. Confirm the existing Firebase Admin SDK initialization and regional database URL.
4. Ensure App Check is configured and enforced for the web app; otherwise calls will fail closed.
5. Verify administrator UID allowlist against production and, ideally, replace it with centrally managed server-side role claims. The browser UID check is only a convenience.
6. Review payment-verification audit requirements; the current transaction record is not an immutable audit ledger.
7. Fix application intake to preserve prior history across renewals, and ensure approval/entitlement projection is recoverable from partial failures.
8. Add account ownership and privacy tests for public membership lookups, especially sponsor profiles.

## Required negative tests (emulator)

- Anonymous and unverified users cannot submit applications.
- A client cannot directly read or write either private membership path, even when signed in.
- A user cannot set `status`, `paymentStatus`, `approvedAt`, `expiresAt`, `pricePence` or `approvedBy`.
- Non-admin callable review/list requests are denied.
- An admin cannot activate a paid application without verified payment.
- A client cannot read another applicant's email or payment information.
- Duplicate application submissions cannot overwrite pending/active records.
- Expired entitlements are treated as inactive, without deleting earned badges.
- A failed entitlement projection can be retried without charging twice.
- Existing sponsor management, supporter profiles, official-member claims and badge management continue working.

## Deployment gate

**Do not merge or deploy** until the complete production rules are reviewed, tests pass, and the real Functions source is located. This branch contains development code, not a live payment service.
