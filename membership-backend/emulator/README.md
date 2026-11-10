# STEP 43 — Isolated Firebase emulator test fixture (NOT EXECUTED)

This directory contains a **minimal private-path rules fixture**, not the full Team Wolfpack production rules. It is suitable only for a focused denial test; it cannot prove that the complete production rules have no permissive ancestors or that existing app features still work.

## Isolation
- Project: `demo-team-wolfpack-membership-isolated`
- Auth emulator: `127.0.0.1:19109`
- RTDB emulator: `127.0.0.1:19012`
- Functions emulator: `127.0.0.1:15001`
- No UI; no deployment; no production credentials or data.
- Do not run if these ports conflict with an existing emulator session.

## How to run in a separate isolated test checkout
1. Install `@firebase/rules-unit-testing` in a **separate test-only environment**. Do not change the real `functions/package.json`.
2. Start the isolated emulator with `firebase emulators:start --project demo-team-wolfpack-membership-isolated --config membership-backend/emulator/firebase.membership-isolated.json --only auth,database` from the repository root. This test uses no Functions emulator yet.
3. Set `GCLOUD_PROJECT=demo-team-wolfpack-membership-isolated` and `FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:19012` for the test process.
4. Run `node --test membership-backend/emulator/private-database-rules.emulator.test.js`.
5. Confirm all **48 client read/write denials** (6 paths × 4 roles × 2 operations).

The test refuses to run unless the isolated environment variables match exactly. This does **not** prevent misuse if a user manually points an unrelated emulator at the same port; verify ports before running.

## Remaining emulator work
- Merge the proposed rules into a **copy of the actual complete rules**, then rerun the same denials against that merged copy.
- Add Firebase Functions integration tests using the existing real `functions/index.js` in an isolated checkout.
- Verify App Check emulator handling; never disable production enforcement to make tests pass.
- Exercise actual callables for authentication, official-account rejection, admin-only payment verification, entitlement activation, renewal retries, and profile/badge preservation.
- Validate existing app functions and rule paths for regressions.

**Status: files committed to development branch only; no tests run and no production changes.**
