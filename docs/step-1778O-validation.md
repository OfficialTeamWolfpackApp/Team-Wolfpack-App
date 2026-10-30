# STEP 1778O — Firebase rules validation

**Current state:** Offline structural checks added. Firebase rules compilation, emulator authorization tests and live deployment have **not** been performed.

## Run local structural checks

```sh
node tests/check-supporter-rules.cjs
```

The script checks JSON parsing, default deny, existing owner/email-verification checks, immutable joinedAt, field size limits, HTTPS validation, unknown-field rejection, and selected badge/admin protections. These are **static assertions only**. They do not execute Firebase rule expressions.

## Before publishing

Use the Firebase Emulator Suite to compile `firebase/database.rules.json` and test these scenarios with authenticated and unauthenticated contexts:

| Scenario | Expected |
|---|---|
| Public reads `publicSupporterProfiles` | Allow |
| Unauthenticated creates a profile | Deny |
| Unverified owner creates/edits | Deny |
| Verified owner creates name + server joinedAt | Allow |
| Verified owner edits location, bio, valid HTTPS links | Allow |
| Verified owner clears optional fields | Allow |
| Verified owner modifies joinedAt | Deny |
| Verified owner edits someone else's UID | Deny |
| Verified owner adds arbitrary child key (role/admin/email) | Deny |
| Verified owner uses HTTP or invalid social host | Deny |
| Verified owner exceeds field length | Deny |
| Public reads `supporterProfiles` (private email) | Deny |
| Supporter awards own `memberBadges` | Deny |
| Supporter writes `officialTeamBadges` | Deny |
| Supporter writes `officialTeamAccountLinks` | Deny |
| Official team and admin existing workflows | Regression test |

## Emulator setup

The repository does not currently include a Firebase CLI configuration. Do not add a production deployment target or run `firebase deploy` as part of this step. To test locally, create a temporary emulator-only `firebase.json` outside the repository with:

```json
{
  "database": {"rules": "firebase/database.rules.json"},
  "emulators": {"database": {"port": 9000}, "ui": {"enabled": false}}
}
```

Use the Firebase CLI and an appropriate local Java runtime to start the database emulator, then execute rule-unit tests with `@firebase/rules-unit-testing`. Record the compiler result and test outcomes before any live publication.

## Review caveat

This file is based on the owner-supplied Firebase rules snapshot. If production rules have changed since that snapshot, reconcile changes before deployment. The proposed rules currently permit a verified official-team user to write their own public supporter record; a separate official-account exclusion must be designed if that behavior is unacceptable.
