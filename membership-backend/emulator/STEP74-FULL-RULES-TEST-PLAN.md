# STEP 74 — Full reviewed rules emulator verification (local-only)

The synthetic GitHub Actions smoke test passed. **It does not validate the actual Team Wolfpack rules.**

## Reviewed inputs

The user's original Realtime Database rules are local files, not stored in this repository. Do **not** commit original or merged production rules to GitHub or put them into workflow logs/artifacts.

In the development checkout, from the repository root:

1. Copy the reviewed original rules JSON to a secure local path outside the repository.
2. With Node 24, Java 21 and Firebase CLI installed, run:
   `node membership-backend/emulator/prepare-full-rules.js "/absolute/path/to/reviewed-original-rules.json"`
3. Review the generated files and run:
   `cd membership-backend/emulator`
   `npm install --no-audit --no-fund`
   `npm run check`
   `npm run preflight`
   `npm run test:isolated`
4. Retain the terminal's exit code and test totals; do not claim success without actual output.
5. Remove generated rules fixtures after testing, and do not add them to Git.

## Acceptance criteria

- All existing rule subtrees are unchanged.
- All six membership paths deny client reads and writes for anonymous, supporter, official, and admin test identities.
- Firebase CLI uses `--project demo-team-wolfpack-membership-isolated`, with only the loopback Auth/Database emulators.
- Existing emulator processes are untouched; the runner aborts if required ports are occupied.
- No production deployment or Firebase Admin SDK writes occur.

## Current status

**FULL-RULES RUNTIME TESTING NOT YET VERIFIED.** The synthetic emulator smoke test and static rules comparison are separate evidence and must not be confused.
