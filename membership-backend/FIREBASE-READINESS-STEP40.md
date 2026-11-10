# STEP 40 — Firebase integration readiness audit (development only)

## Scope and verified source configuration
- Existing local Firebase project (previously supplied): Node 24; `firebase-functions ^7.0.0`; `firebase-admin ^13.6.0`; functions source `functions/`; default region `europe-west1`.
- Development branch: seven callable source modules exporting 11 endpoints through `staging-function-registry.js`.
- All seven callable modules use Firebase Functions v2 `onCall`, Admin RTDB `getDatabase`, `enforceAppCheck:true`, and `europe-west1`.
- Existing `functions/index.js` initializes Admin SDK. The registry must be invoked only after that initialization.
- Existing rules and staged membership rules are separate; neither has been deployed.

## Blocking integration checks
1. **App Check:** `sponsorship-application.html` and `membership-reminder-preferences.html` initialize Auth and Functions but not App Check. All 11 callables enforce App Check. Configure the site's actual App Check provider and site key, and initialize App Check before calling functions. Do not fabricate a site key or disable enforcement to bypass this.
2. **Existing Functions source:** The 11 callables and their helper modules live in the website development branch, not the local `functions/membership-backend/` directory. Copy and register only in isolated staging, retaining the original `functions/index.js`.
3. **Database rules:** Merge the six private membership paths into a *copy* of the real complete RTDB rules; check ancestor grants and test both reads and writes as unauthenticated, supporter, official and admin callers.
4. **Runtime:** Syntax and pure-unit checks are insufficient. Install the existing Functions project's dependencies and load the combined entrypoint with the Auth/Database emulators using an isolated `demo-` project and distinct ports.
5. **Review flow:** Verify that payment verification and entitlement projection failures remain recoverable without duplicate approvals.
6. **Renewal flow:** Test transaction retries, simultaneous activation, stale entitlement projection and ledger reconciliation.
7. **Reminders:** Outbox creation is not delivery. There is no scheduled sender or approved transport. Consent must default off.
8. **Regression:** Existing official-member claims, badges, supporter deletion, sponsor features and notification functions must continue to load and pass their own tests.

## Automated checks added
`firebase-compatibility.test.js` checks callable module imports, region, App Check enforcement and staging registration. It is included by the `membership-backend/*.test.js` CI glob.

## Decision
**NOT READY FOR PRODUCTION DEPLOYMENT.** No emulator or Actions success has been verified. Do not merge to `main`, deploy Functions, or replace database rules.
