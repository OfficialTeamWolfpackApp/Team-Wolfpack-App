# Sponsorship integration - Step 11 existing Functions source inventory

Date: 2026-11-08
Repository: `OfficialTeamWolfpackApp/Team-Wolfpack-App`
Branch under review: `development/sponsorship-integration`

## Repository search result

A repository search found `official-member-auth-step-9b-review.js` on `main`. It contains two candidate exports:

- `syncOfficialMemberClaim` (HTTPS request function)
- `syncOfficialMemberLink` (Realtime Database write trigger)

The file is explicitly named as a review artifact and is not the authoritative `functions/index.js`. It is not safe to assume it is the complete currently deployed Functions source.

## Important compatibility discrepancy

The review artifact's `syncClaim()` only sets/removes the `officialMember` custom claim. The established Team Wolfpack implementation described in the project context also uses `officialMemberSlug`. Therefore, this review artifact must not be copied into the production Functions entry point without reconciliation against the current deployed implementation.

The artifact also does not provide the full Functions package manifest, lockfile, all imports, or a complete production entry point.

## Current inventory

| Required source | Found in repository? | Decision |
|---|---:|---|
| Complete authoritative production `functions/index.js` | No | Still required |
| Complete production `functions/package.json` | No | Still required |
| Production lockfile | No | Still required |
| All deployed Functions modules | Not established | Still required |
| Review artifact for official-member functions | Yes | Reference only; not authoritative |
| Sponsorship function draft and tests | Yes, on development branch | Keep isolated |

## Step 11 decision

Do not merge the review artifact into the sponsorship Functions entry point. Do not replace or modify the production Functions source based on this partial evidence.

The safe next action is to obtain the authoritative deployed Functions source from the Firebase project or the local source directory and add it to this development branch. Exclude all credentials and service-account keys.

## Safety state

- Main branch modified: no
- Production Functions deployed: no
- Production database rules modified: no
- Live database writes: no
- Sponsorship remains disabled pending integration and security review
