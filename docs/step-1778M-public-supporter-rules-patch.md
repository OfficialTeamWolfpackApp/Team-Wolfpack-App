# STEP 1778M — Public supporter profile Realtime Database rules patch

**Status:** Proposed patch only. Not deployed or emulator-tested.

The owner supplied the existing Realtime Database rules on 30 October 2026. The existing rules have 22 top-level nodes and deny root reads/writes by default. The existing `publicSupporterProfiles` branch grants public read, and allows an email-verified authenticated user to create or update only their own UID record, provided `name` and immutable `joinedAt` satisfy the existing constraints. The branch currently rejects all other child keys using `$other`.

## Minimal patch

In the **existing** Realtime Database rules, find:

```json
"publicSupporterProfiles": {
  ".read": true,
  "$uid": {
    ".write": "auth != null && auth.uid === $uid && auth.token.email_verified === true && newData.exists() && newData.child('name').isString() && newData.child('name').val().length >= 2 && newData.child('name').val().length <= 40 && newData.child('joinedAt').isNumber() && (( !data.exists() && newData.child('joinedAt').val() === now) || (data.exists() && newData.child('joinedAt').val() === data.child('joinedAt').val()))",
    ".validate": "newData.hasChildren(['name', 'joinedAt'])",
    "name": {
      ".validate": "newData.isString() && newData.val().length >= 2 && newData.val().length <= 40"
    },
    "joinedAt": {
      ".validate": "newData.isNumber()"
    },
    "$other": {
      ".validate": false
    }
  }
}
```

Replace **only that object** with:

```json
"publicSupporterProfiles": {
  ".read": true,
  "$uid": {
    ".write": "auth != null && auth.uid === $uid && auth.token.email_verified === true && newData.exists() && newData.child('name').isString() && newData.child('name').val().length >= 2 && newData.child('name').val().length <= 40 && newData.child('joinedAt').isNumber() && ((!data.exists() && newData.child('joinedAt').val() === now) || (data.exists() && newData.child('joinedAt').val() === data.child('joinedAt').val()))",
    ".validate": "newData.hasChildren(['name', 'joinedAt'])",
    "name": {
      ".validate": "newData.isString() && newData.val().length >= 2 && newData.val().length <= 40"
    },
    "joinedAt": {
      ".validate": "newData.isNumber()"
    },
    "location": {
      ".validate": "newData.isString() && newData.val().length <= 80"
    },
    "bio": {
      ".validate": "newData.isString() && newData.val().length <= 600"
    },
    "facebook": {
      ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^https:\\/\\/(www\\.)?(facebook\\.com|fb\\.com)\\/[^\\s]*$/)"
    },
    "instagram": {
      ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^https:\\/\\/(www\\.)?instagram\\.com\\/[^\\s]*$/)"
    },
    "tiktok": {
      ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^https:\\/\\/(www\\.)?tiktok\\.com\\/[^\\s]*$/)"
    },
    "youtube": {
      ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^https:\\/\\/(www\\.)?(youtube\\.com|youtu\\.be)\\/[^\\s]*$/)"
    },
    "website": {
      ".validate": "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^https:\\/\\/[^\\s]+$/)"
    },
    "$other": {
      ".validate": false
    }
  }
}
```

**Important:** The patch above is a review artifact, not a full rules document. JSON-escaped regular expressions and Firebase rules parser compatibility must be checked with the Firebase Emulator Suite before publication. The proposed social regexes intentionally permit the common `www` subdomain; the frontend also permits other subdomains, so some valid frontend URLs may be rejected by these stricter rules.

## Security review observations

- The original `publicSupporterProfiles` `.write` condition already protects ownership and email verification, and locks `joinedAt`. This patch retains those controls.
- The original `supporterProfiles` branch contains private account fields including email; it remains unchanged and private.
- `memberBadges` and `officialTeamBadges` are management-write-only and remain unchanged.
- `memberFeaturedBadges` already lets a supporter choose from badges awarded to them; leave unchanged.
- `officialTeamAccountLinks` is management-write-only and remains unchanged.
- **Existing behavior:** An authenticated verified official team member could also write a record at their own `publicSupporterProfiles/<uid>` path; excluding official identities requires a separate, carefully reviewed rule change.
- **Existing behavior:** Public profile reads are unrestricted, including the directory root. Only put intentionally public fields here.
- **Existing behavior:** `supporterProfiles/<uid>` name sync is separately authorized and should be tested when the name is changed.
- Empty optional strings in Realtime Database are commonly stored as absent values; test clearing optional fields.
- The existing rules for deletion, badges, comments, points, contact submissions, and admin operations must not be broadened.

## Required tests before deploying

1. Verified owner creates profile with `name` and `joinedAt`; creation passes.
2. Verified owner edits location, bio and each HTTPS link; allowed.
3. Verified owner clears optional fields; allowed.
4. Anonymous/unverified user cannot write.
5. Verified user cannot write another UID.
6. Verified user cannot alter `joinedAt`.
7. Verified user cannot add `role`, `admin`, `email`, `badge`, or any unexpected field.
8. Oversized fields, HTTP links and social links to the wrong domain are denied.
9. Public profile reads succeed; private `supporterProfiles` data is not publicly readable.
10. Existing badge assignment, official member profiles, Live Updates and supporter registration still work.

**No Firebase console publication is authorized by this commit.**
