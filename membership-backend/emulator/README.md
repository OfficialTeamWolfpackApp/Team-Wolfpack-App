# Isolated membership Firebase emulator tests — Steps 43–49

**Status: staged only; not executed. No production deployment.**

The isolated emulator configuration now references `database-rules.full-merged.json`, generated from a **reviewed original Team Wolfpack rules file**. The minimal `database-rules.emulator.json` is historical and must not be used for the complete-rules test.

## Setup (development checkout only)

1. Confirm ports 19109 (Auth) and 19012 (RTDB) are free; do not stop or restart any existing emulator session.
2. Install Node.js 24+, Java, and Firebase CLI separately. Run `npm install` from `membership-backend/emulator` to install the test-only `@firebase/rules-unit-testing` dependency. Do not change production Functions dependencies.
3. From the repository root, generate the two **untracked** fixtures from your reviewed original rules: `node membership-backend/emulator/prepare-full-rules.js PATH_TO_REVIEWED_ORIGINAL_RULES.json`. Do not commit original production rules if they contain information not intended for the repository.
4. From `membership-backend/emulator`, run `npm run check` then `npm run preflight`.
5. Only when preflight passes, run `npm run test:isolated`. The runner uses `firebase emulators:exec` and exits after tests finish.

## What the tests cover

- Static preservation of all original top-level rules entries and six new private membership nodes.
- 48 client read/write denials: six private paths × anonymous, supporter, official and admin client contexts × two operations.
- Tests require exact demo project `demo-team-wolfpack-membership-isolated` and RTDB host `127.0.0.1:19012`.

## Limitations

- **Tests have not been executed**; no passing test results are claimed.
- These are database rules tests, **not callable-function integration tests**. They do not establish payment verification, membership activation, renewal concurrency, App Check acceptance, or existing-feature regression safety.
- The generated fixture is local only and is not automatically present on GitHub.
- This test harness is not a deployment configuration. Never use it to deploy production rules.
