# STEP 28 — Staging package manifest (NOT DEPLOYED)

## Target layout in the actual Firebase project

```text
team-wolfpack-functions/
  firebase.json                         (keep original)
  database.rules.json                  (keep original until emulator-tested merge)
  functions/
    index.js                            (keep original; append reviewed exports only)
    package.json                        (keep original; Node 24, firebase-admin 13, firebase-functions 7)
    membership-backend/
      membership-policy.js
      membership-entitlements.js
      membership-renewal.js
      reminder-delivery-policy.js
      submit-membership-application.js
      admin-membership-review.js
      public-membership.js
      admin-membership-renewal.js
      admin-renewal-alerts.js
      membership-reminder-outbox.js
      reminder-preferences.js
      staging-function-registry.js
```

The source of the listed membership modules is the GitHub development branch under `membership-backend/`. The real project uses `functions/` as its source directory; preserve the subdirectory when copying modules. Relative imports such as `require("./membership-policy")` must remain valid.

## Registration in existing functions/index.js

After checking existing exports, append **only in isolated staging**:

```js
Object.assign(
  exports,
  require("./membership-backend/staging-function-registry")
    .registerMembershipExports(exports)
);
```

**Prefer the simpler form** below to avoid unnecessary assignment:

```js
require("./membership-backend/staging-function-registry")
  .registerMembershipExports(exports);
```

Do not register `staging-function-registry.js` as a Cloud Function itself. The registry deliberately excludes pure helpers. The Firebase Admin SDK is initialized once in the existing index.js.

## Private database paths

The six proposed membership paths are `membershipApplicationIntake`, `membershipEntitlements`, `membershipAccounts`, `membershipRenewalRequests`, `membershipReminderPreferences`, and `membershipReminderOutbox`. Merge proposed rules into the real complete rules file; do not replace the full rules with a fragment. The supplied complete rules already deny reads and writes at the root, but the membership nodes should have explicit denials for auditability.

## Validation gate

1. Confirm the staged index exports exactly the intended 11 membership callables and no duplicates.
2. Run static JavaScript syntax checks for every new module and index.js.
3. Run membership policy and reminder-delivery-policy unit tests.
4. Use a dedicated `demo-` Firebase project and isolated emulator ports, **never** the live project.
5. Emulator-test anonymous, unverified, verified supporter, official member and admin callers; verify App Check and ownership restrictions.
6. Verify payment status cannot be forged, activation requires manual admin verification, and renewal retry is idempotent.
7. Verify existing notifications, badges, supporter account deletion, sponsor functions and official-member claims remain functional.
8. Confirm the website initializes Firebase App Check before invoking `enforceAppCheck:true` callables.
9. Check no reminder dispatcher sends emails or pushes; consent defaults off.
10. No deployment or merge to `main` until all gates pass.

## Known limitations

- This manifest is **not** a packaged ZIP and no files have been copied into the user's local Firebase project.
- Existing `functions/index.js` is not changed by this commit.
- Source functions and security rules have not been executed against the emulator.
- Existing source and the new membership functions require a compatibility review before registration.
