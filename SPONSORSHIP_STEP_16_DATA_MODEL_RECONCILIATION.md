# Step 16 — CI verification and sponsor account data-model reconciliation

Date: 2026-11-08

## CI result

GitHub Actions run `42505799020`, commit `452cc31a2ae8a00274334a96d49ce533ed367b10`: **completed / success**.

The workflow includes the new fail-closed integration safety tests and checks frontend JavaScript syntax. It does **not** exercise a live Firebase project, deploy Functions, or prove RTDB rules enforcement.

## Source comparison (uploaded integration preview)

The local `sponsor-account-management.js` performs a single transaction on `sponsorAccountManagement`. Its record contains:

- `linksBySponsor/{sponsorId} = uid`
- `linksByUid/{uid} = sponsorId`
- `accountStatus/{uid} = {sponsorId, active, updatedAt}`
- `auditEvents/{eventId}` inside the same transaction.

The local `sponsor-account-verification.js` instead reads:

- `sponsorAccountLinks/{sponsorId}`
- `sponsorAccountByUid/{uid}`

These paths are different. Verification can therefore miss a link established by management, or produce a conflicting result if both data models contain records.

## Recommended canonical design — proposal, not yet implemented

Prefer `sponsorAccountManagement` as the canonical account-link store because management already updates its forward and reverse indexes, account status, and audit events atomically.

Before changing the verifier:

1. Inspect existing live RTDB data and security rules **read-only**, to establish whether either legacy link path contains real records. Do not delete or migrate anything based on assumptions.
2. Make the verifier read the canonical `sponsorAccountManagement` node consistently (forward and reverse indexes and status) with a single snapshot, preserving its existing admin authorization, email verification, official-member exclusion, CORS, and error handling.
3. If legacy records exist, design an explicit, audited migration or fail-closed conflict policy. Do not silently prefer a stale record.
4. Add isolated tests: unlinked; valid link; UID conflict; sponsor conflict; inconsistent forward/reverse links; inactive status; admin account; official member; unverified/disabled account; concurrent link/unlink.
5. Verify Firebase Admin SDK behavior in an isolated emulator and check the full RTDB rules before deployment.
6. Keep the sponsorship feature flags off and do not deploy until the integration is approved.

## Repository status

The local production modules have been reviewed from the uploaded integration preview, but have **not** been committed as a complete Functions tree to this branch. The branch still contains a sponsorship-only Functions scaffold. Do not deploy this scaffold.

- GitHub Actions safety checks: PASS
- Sponsor data model consistency: FAIL — reconciliation required
- Full production source integrated into GitHub: NOT YET
- Emulator integration tests: NOT YET
- Production deployment: NO
- Live RTDB writes: NO
