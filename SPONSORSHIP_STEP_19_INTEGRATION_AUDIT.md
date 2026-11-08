# Step 19 — Sponsor verification and management integration audit

Date: 2026-11-08

## CI verification

GitHub Actions run **42507107408** on commit `f860921d38e6ca7c3606cd005450830628f45d74` completed with **success**. This confirms the current development-branch syntax and offline test suite passed; it is not a Firebase emulator or production security result.

## Reviewed source

Reviewed `functions/sponsor-account-verification.js` and `functions/sponsor-account-management.js` in the user-supplied `team-wolfpack-functions-integration-preview.zip`.

The verification function currently reads legacy `sponsorAccountLinks` and `sponsorAccountByUid`, while management performs a transaction under `sponsorAccountManagement` using `linksBySponsor`, `linksByUid`, and `accountStatus`.

## Required implementation safeguards

1. Verification must use the same canonical snapshot as management and explicitly detect inconsistent forward/reverse indexes, inactive status, and duplicate mappings. The current `sponsor-link-consistency.review.js` is a **pure offline review helper**, not connected to the deployed verification endpoint.
2. Both verification **and management** must detect legacy records and fail closed until existing data is inventoried. A verifier-only legacy check is insufficient.
3. Management must retain its **atomic transaction**; do not split its link indexes and audit event into independent writes.
4. Authentication eligibility is checked before management's transaction in the uploaded source. This creates a time-of-check/time-of-use window if an account is disabled or made an official member after the check. Define an acceptable policy and test this; an RTDB transaction cannot atomically lock Firebase Auth claims.
5. Add tests covering concurrent requests, conflicting records, partial indexes, account disablement, official-member assignment, legacy records, and failure responses. The 11 existing tests exercise a standalone pure helper, not the HTTP functions.
6. The review helper should not be described as sufficient global database integrity validation: it examines a requested sponsor/UID pair, and it does not prove every unrelated link is consistent.

## Deployment gate

**BLOCKED** until the original production Functions tree is reconciled, complete RTDB rules are verified, migration/legacy policy is approved, and isolated Firebase emulator tests pass.

No production deployment, live database write, or main-branch modification occurred during this audit.
