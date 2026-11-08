# Step 23 — Integration contract and pre-deployment gate

Date: 2026-11-08

## Verified CI

GitHub Actions run `42508914449` completed **successfully** on commit `61b8e5142b7fc6d4a3f2538667b5941eb3f25a01`. This verifies the development branch's offline tests, **not** Firebase emulator or production behavior.

## Reviewed original management source

The user's original `functions/sponsor-account-management.js` from the uploaded integration preview exports three HTTPS handlers:

- `linkSponsorAccount`
- `unlinkSponsorAccount`
- `setSponsorAccountStatus`

It uses one RTDB transaction on `sponsorAccountManagement` to update the forward index, reverse index, account status, and audit event. On unlink, it removes the indexes but leaves `accountStatus/{uid}` with `active: false`.

The new review-only `sponsor-operation-policy.review.js` handles `verify` and `link` preflights only. **It must not be directly inserted into all three management operations.** Unlink and status updates require their own transition rules.

## Explicit operation contract (proposed)

| Operation | Required initial state | Expected transition | Notes |
|---|---|---|---|
| verify | any consistent state | no write | Reject legacy conflicts and malformed indexes; validate auth/eligibility separately. |
| link | unlinked, or same-sponsor inactive history | create both indexes and inactive status | Preserve audit in transaction; reject conflicting mappings. |
| link existing | same pair with both indexes | no write | Existing management endpoint returns `alreadyLinked: true`; preserve idempotency. |
| unlink | same pair, both indexes | remove both indexes; retain inactive history | Reject partial or conflicting indexes; preserve audit. |
| status | same pair, both indexes, matching status | update `active` | Reject partial or conflicting indexes; preserve audit. |

## Blocking issues

1. **Legacy data:** Management currently does not read `sponsorAccountLinks` or `sponsorAccountByUid`. A verifier-only legacy guard is insufficient; a safe migration/inventory policy is required.
2. **Atomicity:** Any consistency validation that authorizes a write must run against the **current transaction snapshot**, not only a preflight read.
3. **Auth race:** The original `validateAccount` checks Firebase Auth before RTDB transaction. Auth claims cannot be locked by the RTDB transaction. Recheck or compensate for concurrent disablement/official-member changes.
4. **State transitions:** The review policy currently rejects existing inactive linked accounts for a new link operation, while management treats any existing pair as idempotently linked. Preserve documented endpoint behavior until a deliberate API change is approved.
5. **Data-model audit:** Determine whether any existing production sponsor links use legacy paths before enabling or migrating.
6. **Full source:** The GitHub development branch still has a sponsorship-only `functions/index.js` scaffold, not the authoritative complete Functions entry point. Do not deploy.
7. **Rules and emulators:** Full production RTDB rules and isolated Firebase Auth/RTDB tests are not yet verified.

## Safety

No production deployment, database writes, migrations, or main-branch changes were made in Step 23. All review helpers remain disconnected from active Functions.
