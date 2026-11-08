# Step 12 - Uploaded production Functions source inventory

Received three local files from the user on 2026-11-08:
- `index(8).js` (local Functions entry point, 1,503 lines)
- `package(4).json` (local Functions manifest)
- `package-lock.json` (local lockfile)

## Confirmed manifest

- Node.js engine: **24** (development scaffold currently says 22)
- `firebase-admin`: **^13.6.0**
- `firebase-functions`: **^7.0.0** (development scaffold currently says ^6.4.0)
- Development dependencies: `@firebase/rules-unit-testing`, `eslint`, `eslint-config-google`, `firebase-functions-test`
- Manifest and lockfile root dependency/engine declarations match.

## Exported functions found in uploaded index.js

1. registerMrsWolfiePushDevice
2. sendMrsWolfieUpdateNotification
3. sendMrsWolfieFightNotification
4. registerTeamWolfpackPushDevice
5. sendTeamWolfpackNotification
6. deleteTeamWolfpackNotificationHistory
7. submitContactEnquiry
8. cleanupContactSubmissionLimits
9. checkSupporterDeletionEligibility
10. awardMemberBadge
11. revokeMemberBadge
12. awardFirstSteps
13. syncOfficialMemberClaim
14. syncOfficialMemberLink
15. renewSponsorshipAgreement
16. verifySponsorAccount
17. setSponsorAccountStatus
18. linkSponsorAccount
19. unlinkSponsorAccount
20. submitSponsorshipApplication

The uploaded index.js passes `node --check`. It already exports the sponsorship function; **do not append a duplicate export**.

## Local modules imported by the uploaded index

These are required for complete startup and must be provided or independently verified against the authoritative local Functions project:

- `contact-enquiries.js`
- `contact-cleanup.js`
- `supporter-account-deletion.js`
- `badge-management.js`
- `automatic-achievements.js`
- `official-member-auth.js`
- `sponsorship-renewal.js`
- `sponsor-account-verification.js`
- `sponsor-account-management.js`
- `submit-sponsorship-application.js` (a development draft already exists, but must be reconciled with local source)

The manifest's `lint:production` also references `supporter-deletion-engine.js`, which is not directly imported by `index.js`; it may be imported transitively and should be included in the inventory.

## Safe integration decision

The three uploaded files are enough to identify the **correct production entry point and dependencies**, but not enough to create a complete runnable Functions project because the imported modules are missing. The branch's current `functions/index.js` and `functions/package.json` are incomplete placeholders; **do not deploy them**. Do not overwrite them until the remaining source modules are present and verified.

No production deployment, database writes, or live rules changes have been performed.
