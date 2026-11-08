# Step 17 — Sponsor verification candidate (NOT DEPLOYABLE)

The proposed implementation is in `functions/review/sponsor-account-verification.candidate.js`. It is a **review copy**, not an active Functions module and is not exported by `functions/index.js`.

## Candidate behavior

- Preserves the uploaded verifier's administrator-token, administrator eligibility, sponsor eligibility, account email-verification, official-member exclusion, CORS and error-response checks.
- Reads forward/reverse account links from the same `sponsorAccountManagement` snapshot used by the uploaded management module.
- Detects duplicate sponsor/UID links, partial indexes and status-link inconsistencies.
- **Fails closed** with `LEGACY_LINK_REVIEW_REQUIRED` if either legacy node (`sponsorAccountLinks`, `sponsorAccountByUid`) contains records. This is intentionally conservative until a read-only inventory establishes whether legacy records exist.
- Does not migrate, delete, or write any database data.

## Unresolved issues

1. The management endpoint must also reject or reconcile legacy links before any new links are created; updating the verifier alone does not prevent dual-model conflicts.
2. The verifier is a preflight check, not a transaction or authorization guarantee. Management must recheck link state atomically and account eligibility before changing state.
3. The candidate has not been tested against real Firebase Auth/RTDB emulators, including concurrent requests.
4. The uploaded source and complete production Functions package have not been committed to the development branch as an executable deployment tree.
5. The full current production database rules have not been verified.

## Tests and safety

The candidate passed local `node --check` syntax verification. No emulator tests, deployment, production writes, or changes to `main` were performed.

**Do not deploy this candidate or replace the production verifier without completing the migration and emulator tests.**
