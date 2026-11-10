# Step 22 — Firebase Functions integration inventory (not deployed)

## Repository discovery
A GitHub search of this repository for `firebase.json`, `functions/index.js`, `database.rules.json` and `package.json` found no matching files. Search results do not prove absence, but the actual Firebase Functions source and complete RTDB rules have **not** been located here. Do not assume the website repository is deployable as Functions.

## Proposed module exports for existing Functions index
After locating the real Functions project, review each module, then register:
```js
Object.assign(exports, require("./membership-backend/submit-membership-application"));
Object.assign(exports, require("./membership-backend/admin-membership-review"));
Object.assign(exports, require("./membership-backend/public-membership"));
Object.assign(exports, require("./membership-backend/admin-membership-renewal"));
Object.assign(exports, require("./membership-backend/admin-renewal-alerts"));
Object.assign(exports, require("./membership-backend/membership-reminder-outbox"));
Object.assign(exports, require("./membership-backend/reminder-preferences"));
```
**Illustrative only**: module locations may differ in the real Functions project. Verify exports and initialize the Admin SDK once before using Database.

## Integration blockers to resolve before any deployment
1. Locate the real Functions repository/project and its `package.json`, Firebase CLI config, full Realtime Database rules, and deployed functions index.
2. Verify callable request/response contracts against the actual frontend. Confirm the site has Firebase App Check configured: all new callables enforce App Check.
3. Confirm secure administrator authorization and role lifecycle; the current functions use a hardcoded UID allowlist.
4. Review **critical**: membership activation and renewal are currently split across multiple database paths. An entitlement projection can fail after a successful approval. Test retry/reconciliation and define one authoritative membership ledger.
5. Review **critical**: the renewal request code generates a random ID **inside a Realtime Database transaction callback**, which can retry; generate it once before the transaction.
6. Review **critical**: `buildRenewal` requires the previous entitlement's `approvedAt` and dates, and can extend from a future expiry; verify all legacy data and date arithmetic.
7. Review **critical**: the private rules fragment is not a complete rules file; permissive ancestor rules override descendant restrictions.
8. Review privacy: consent defaults to off; no email/push dispatcher exists. Consent must be checked again immediately before sending.
9. Review application resubmission, history retention, immutable payment audit evidence and admin retry behavior.
10. Run Node tests and Firebase emulators with isolated project IDs, then regression-test existing official members, profiles, sponsors, achievements and account deletion.

## Deployment status
- Live main branch: unchanged.
- Cloud Functions: not deployed from this work.
- Database rules: not deployed.
- Reminder delivery: disabled.
- Security and emulator tests: not run.
