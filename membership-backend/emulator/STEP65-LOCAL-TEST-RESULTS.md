# STEP 65 — Local checks actually executed (2026-11-10)

Scope: local, static verification of previously supplied Firebase source and staged rules. **Not an emulator test.** No production deployment or writes.

| Executed command / assertion | Result |
| --- | --- |
| `node --check /mnt/data/index.membership-integration-STAGING.js` | PASS |
| `node --check /mnt/data/index(10).js` | PASS |
| `node /mnt/data/verify-full-rules-step44.js` | PASS: 22 original top-level rules entries unchanged; six membership paths added |
| Node assertion on `database.rules.membership-staging.json` | PASS: all six membership nodes explicitly set `.read: false` and `.write: false` |
| `node --version` | v22.16.0 (not the required Node 24) |
| `which java` | /usr/bin/java |
| `which firebase` | Not found |

The files under `/mnt/data` are **local staged copies** and not proof that the current GitHub branch or the deployed project matches them. Explicit deny rules at a child path do not override a more permissive ancestor in Firebase RTDB; the full-rules preservation check provides a static comparison, not a runtime authorization guarantee.

**Not run:** GitHub CI confirmation, Firebase Auth/Database emulator tests, callable integration tests, deployment.

**Release gate:** BLOCKED until actual isolated emulator tests and integration tests pass under Node 24, and the final rules and Functions integration are reviewed.
