# Step 27 — Original management transaction integration review

Date: 2026-11-08

## Verified baseline

The latest Step 26 GitHub Actions run, `42510951074`, completed successfully. This confirms offline checks only; it is not a Firebase emulator result.

## Original source reviewed

Source: user-provided `functions/sponsor-account-management.js` in the local integration preview, particularly the transaction body around lines 190–340. This original source is **not yet installed** in the development branch's active Functions entry point.

The existing endpoint:
1. Validates eligibility outside the RTDB transaction for link actions.
2. Generates an audit push key and timestamp before starting a transaction at `sponsorAccountManagement`.
3. Reads `linksBySponsor`, `linksByUid`, and `accountStatus` from the current transaction snapshot.
4. Updates both indexes and inactive status when linking; removes both indexes but preserves inactive status when unlinking; changes status on status action.
5. Appends an audit record **inside the same transaction** as the account change.
6. On an aborted transaction, responds HTTP 200 with `alreadyLinked: true` for an existing pair, otherwise HTTP 409.

## Differences requiring deliberate resolution before integration

| Area | Original endpoint | Review-only candidate | Decision needed |
|---|---|---|---|
| Existing link | Idempotent HTTP 200 `alreadyLinked` | Adapter returns `undefined` and `ALREADY_LINKED` | Preserve endpoint response; test retries and committed flag. |
| Repeated status | Original writes status and audit again | Candidate treats unchanged status as no-op | Preserve original semantics or explicitly approve change. |
| Existing linked status | Original link path does not require status record | Candidate requires matching status | Choose remediation for old records; do not silently break legitimate users. |
| Unrelated index corruption | Original checks duplicate UID only | Candidate blocks all mismatched indexes | Validate against realistic data size; fail closed pending remediation. |
| Legacy paths | Original transaction does not inspect legacy roots | Candidate expects supplied legacy snapshot | Must not pass an empty legacy object as proof of absence. |
| Audit key | Generated before transaction | Candidate rejects collisions | Ensure stable key across RTDB retries and preserve original event shape. |
| Auth eligibility | Checked before transaction | Pure adapter has no Auth access | Maintain authorization checks and mitigate check/write race. |
| Audit event naming | `LINKED`, `UNLINKED`, `ACTIVATED`, `DEACTIVATED` | Same names | Preserve schema and external consumers. |

## Critical transactional detail

RTDB transaction update callbacks may be invoked multiple times. The pure review adapter returns `{outcome, nextValue}` but cannot itself guarantee that the outcome captured in a mutable outer variable describes the **final** attempt. The integration must derive response state from the final committed snapshot and/or handle retry outcomes explicitly. An `undefined` callback result aborts; a no-op does not imply a committed write. Preserve existing HTTP response compatibility.

## Integration gate

Do **not** replace the original transaction callback yet. First:
- Obtain complete authoritative Functions source and matching RTDB rules in the development branch.
- Inventory legacy forward and reverse sponsor-account paths using isolated or explicitly authorized read-only checks.
- Test a real RTDB emulator transaction with retries, aborted updates, and audit consistency.
- Test Auth eligibility changes during concurrent link attempts.
- Confirm behaviour for repeated status updates and old linked accounts without status.
- Re-run syntax, unit and emulator checks before any staging deployment.

No Firebase deployments, live writes, migrations, main-branch changes, or frontend flag changes in this step.
