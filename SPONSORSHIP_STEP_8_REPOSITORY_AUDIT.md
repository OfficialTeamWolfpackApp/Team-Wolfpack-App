# Sponsorship integration - Step 8 repository audit

Audit date: 2026-11-08
Scope: compare the public `main` branch with the isolated `development/sponsorship-integration` work.
This is a read-only audit record. No production files or Firebase resources were changed.

## Findings from the existing `main` branch

- The repository root contains the existing `admin-dashboard.html`, `admin-sponsors.html`, `admin-contact.html`, `contact.html`, `sponsorship-application.html`, and `admin-sponsorship-enquiries.html`.
- The existing admin dashboard already has Sponsor Management cards linking to `admin-sponsors.html` and a Contact Enquiries section linking to `admin-contact.html`.
- The existing `admin-sponsors.html` initializes the production Firebase web app and checks the two existing admin UIDs:
  - `PRGa9TsCW0QDn1QtoUXyYjEi7YB3`
  - `SlpEQYl94DaH6j42QUyl8Kv2ujJ3`
- The existing `admin-contact.html` reads the `contactEnquiries` Realtime Database node and uses the same two-admin UID allowlist.
- The existing production pages contain Firebase web configuration and existing sponsor/contact workflows. These must be preserved; do not replace them with the sponsorship prototype.

## Repository boundary

A recursive tree inspection of `main` found no `functions/` directory, `firebase.json`, `.firebaserc`, or Firebase database/storage/firestore rules files in this repository's main branch.

Therefore this repository alone does not provide the deployed Cloud Functions source or the current production Realtime Database rules. The local folder previously inspected at `C:\Users\Chris\team-wolfpack-functions` is not automatically evidence that its contents are committed to this repository. Before any deployment or rules change, obtain the authoritative Functions source and complete current RTDB rules from the actual Firebase project/source repository and reconcile them without overwriting existing exports or rules.

## Development-branch safeguards

- Sponsorship Cloud Function, client integration, admin enquiries preview, and mock tests are isolated on `development/sponsorship-integration`.
- The application submit feature flag remains false and the endpoint URL remains blank.
- The admin dashboard data-read feature flag remains false.
- The proposed RTDB rules remain a review-only fragment. They are not a complete rules file and must not be deployed alone.
- No Firebase deployment, live database write, production rules update, or merge to `main` was performed.

## CI result

GitHub Actions run `42501515755` for commit `befc64c2e421b71a752d3084da7e43ee9a5ff2c6` completed successfully. The JavaScript syntax step and isolated mocked security-test step both passed. These are mocked tests and do not prove production Firebase rules, App Check configuration, or deployed endpoint behaviour.

## Required before enabling the feature

1. Identify and inspect the authoritative deployed Functions source and current full RTDB rules.
2. Check the new sponsorship export against all existing function exports; merge rather than replace.
3. Confirm App Check site key/provider and allowed production domains against Firebase Console configuration.
4. Validate rate-limit storage, expiry/cleanup, and abuse controls.
5. Test actual RTDB rules in an isolated emulator with admin, non-admin, and unauthenticated users, including inherited parent rules.
6. Only after all checks pass, prepare a reviewed pull request. Do not deploy or merge automatically.
