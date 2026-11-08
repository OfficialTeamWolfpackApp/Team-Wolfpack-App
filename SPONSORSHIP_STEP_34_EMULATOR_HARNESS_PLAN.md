# Step 34 — Isolated Firebase RTDB Emulator Test Harness Plan

## Baseline
Step 33 CI run 42513794248 completed successfully. This confirms offline JavaScript tests only.

## Purpose
Validate real Realtime Database transaction retries and audited sponsor deactivation **without connecting to production**. The existing `sponsor-remediation-retry.review.js` is a deterministic simulator, not an emulator test.

## Required isolation controls
1. Use a **demo-** project ID, such as `demo-team-wolfpack-sponsorship-isolated`. Reject any project ID that does not begin with `demo-`.
2. Bind the Database emulator to `127.0.0.1` on a free, dedicated test port; do not reuse running Team Wolfpack emulator ports.
3. Set `FIREBASE_DATABASE_EMULATOR_HOST` to the exact loopback host and test port **before** initializing Firebase Admin.
4. Use a temporary, dedicated emulator rules file and temporary test database; never point at production rules or data.
5. Run tests with a unique, isolated namespace and delete only test-created data.
6. Disable live Cloud Functions deployment; do not enable production frontend flags or update the active Functions entry point.
7. Use the authoritative original Functions source and compatible Firebase Admin dependencies for integration tests; do not deploy the placeholder `functions/index.js`.
8. Require a successful emulator startup health check before attempting any writes. Fail closed if the emulator is unavailable.
9. Use an explicit allowlist of test-only paths and reject any non-test target.

## Proposed test scenarios
- Link and deactivate with one atomic RTDB transaction each.
- Two concurrent transactions against the same sponsor link: assert one consistent final state.
- Concurrent unrelated sponsor/audit updates: verify no lost records.
- Concurrent unlink during deactivation: verify link is not resurrected.
- Repeated deactivation: no duplicate audit event.
- Audit ID collision: transaction aborts without overwriting existing event.
- Legacy link fixture: block migration and linking pending review.
- Auth eligibility changes: document the non-atomic Auth/RTDB window and exercise post-commit recheck.

## Implementation gate
This step only adds a reviewed configuration contract and test-plan documentation. Before creating/running a real emulator harness, confirm installed Firebase CLI/Java versions, port availability, and test-only rules. Real emulator runs will require a runner with Firebase CLI and Java; the current GitHub Actions offline workflow does not prove this environment is available.

**No emulator started; no production reads or writes; no Firebase deployment; no main branch changes.**
