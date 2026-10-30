# STEP 1778L — Firebase Realtime Database security review (proposal only)

Status: **Review required. NOT deployed.** This document is a change plan, not a complete or deployable rules file.

## Repository inspection

On branch `design/supporter-public-profile-1778`, the repository does not contain a root `firebase.json`, `database.rules.json`, `database.rules`, or `firebase-database.rules.json` at the inspected paths. The deployed Firebase Realtime Database rules were **not** retrieved. Do not replace the live rules based on this document.

## New fields used by the frontend

The verified supporter can edit their own `publicSupporterProfiles/<auth.uid>` record:

| Field | Validation target |
| --- | --- |
| `name` | string, trimmed, 2–40 characters |
| `location` | optional string, 0–80 characters; city/region only recommended |
| `bio` | optional string, 0–600 characters |
| `facebook`, `instagram`, `tiktok`, `youtube`, `website` | optional HTTPS URL strings, 0–300 characters |

Existing `joinedAt` is created on first activation and must be immutable after creation. Existing member badges, featured badges, `officialTeamAccountLinks`, `teamMembers`, and private `supporterProfiles` must retain their separate permissions.

## Required rules behavior (integrate into current rules; do not copy as standalone rules)

1. Read public supporter profile fields only from `publicSupporterProfiles`, without exposing email or private account metadata.
2. Allow creation/update of `publicSupporterProfiles/<uid>` only for authenticated, email-verified user with `auth.uid === uid`, subject to the existing official-team exclusion.
3. Validate the **entire resulting record** (`newData`), not just the changed keys. Restrict allowed child keys to `name`, `joinedAt`, `location`, `bio`, and the five link fields, plus any explicitly reviewed legacy keys.
4. Reject attempts to change `joinedAt` after initial creation; ensure it is a plausible server timestamp on creation.
5. Ensure name is 2–40 characters, location <=80, bio <=600, each URL <=300, and URL strings are HTTPS. Client-side checks are not a substitute for server-side validation. Consider host allowlists for named social networks.
6. Never let supporters write `memberBadges`, `officialTeamBadges`, `memberFeaturedBadges`, official roles, admin flags, or another user's records.
7. Preserve existing rules for `supporterProfiles/<uid>` (private account, email verification, status), account deletion, and storage photos. Do not enable account deletion.
8. Test creation, updates, other-user writes, anonymous writes, forged badge/role keys, and oversized/unsafe links using Firebase Emulator Suite before any production rules change.

## Frontend integration notes

- `supporter-account.html` now writes `name`, `location`, `bio`, and the five social links using `update()` on the signed-in user's public profile.
- `supporter-profile.html` renders only public fields and sanitizes link protocols and domains before creating anchors.
- `pack.html` official member cards remain unchanged.
- If the current deployed rules reject the new fields, the editor will show a permission error. **Do not broaden production rules blindly.**

## Next prerequisite

Obtain the **current deployed Realtime Database rules** from the Firebase console or the authoritative Firebase configuration repository. Review them, produce a minimal patch preserving existing permissions, and test in the emulator. A GitHub commit alone does not deploy Realtime Database rules.
