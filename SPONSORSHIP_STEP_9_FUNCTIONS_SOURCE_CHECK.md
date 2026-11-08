# Sponsorship integration - Step 9 Functions source verification

Date: 2026-11-08
Branch: `development/sponsorship-integration`
Status: BLOCKED pending authoritative production Functions source. No deployment performed.

## Verified development branch contents

The branch currently contains:

- `functions/index.js`
- `functions/package.json`
- `functions/submit-sponsorship-application.js`
- `functions/submit-sponsorship-application.test.js`

The current `functions/index.js` initializes Firebase Admin and exports only:

```js
exports.submitSponsorshipApplication =
  require("./submit-sponsorship-application").submitSponsorshipApplication;
```

The file itself explicitly says that this branch currently contains the sponsorship function only and that existing production functions must be merged deliberately before deployment.

The package manifest is also a small sponsorship-only manifest (Node 22, firebase-admin, firebase-functions). It is not verified as a complete copy of the deployed production Functions package.

## Decision

Do NOT deploy this branch's `functions/` directory to the production Firebase project. Doing so could replace the existing deployed Functions codebase/exports or omit functions that are not represented here.

The local Windows directory previously inspected by the user is not accessible through GitHub repository reads unless its authoritative source files are committed or uploaded. The snippets from the terminal session do not contain the complete production Functions entry point, package manifest, or all function modules.

## Exact source needed to unblock integration

Add the authoritative, currently deployed/local production Functions source to this development branch, preserving the existing sponsorship files:

1. The complete production `functions/index.js` (all current exports).
2. The complete production `functions/package.json` and lockfile (`package-lock.json`, if used).
3. Every local module imported by that entry point, retaining its relative path.
4. Any required non-secret configuration files. Never commit service-account JSON, private keys, tokens, or other secrets.

Do not replace the current sponsorship function or its tests. Once the full production source is available, compare exports and dependencies, merge the sponsorship export into the authoritative entry point, and run the complete existing test/lint suite plus sponsorship tests.

## Safety state

- Production Functions deployment: NO
- Production RTDB rules changed: NO
- Live database writes: NO
- Production branch changed: NO
- Sponsorship submission feature flag: remains disabled
- Sponsorship admin read feature flag: remains disabled

This is a source-inventory checkpoint, not approval to deploy.
