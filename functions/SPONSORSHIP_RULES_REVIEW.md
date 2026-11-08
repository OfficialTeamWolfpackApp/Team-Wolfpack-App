# Sponsorship Realtime Database rules - REVIEW ONLY

This is a rules fragment, **not** a complete Firebase rules file.
Do not deploy it as-is or replace the existing production rules with it.
Merge these two child nodes into the existing `rules` object after reviewing
the existing rules and testing both authorised and unauthorised access.

```json
{
  "sponsorshipApplications": {
    ".read": "auth != null && (auth.uid === 'PRGa9TsCW0QDn1QtoUXyYjEi7YB3' || auth.uid === 'SlpEQYl94DaH6j42QUyl8Kv2ujJ3')",
    ".write": false
  },
  "sponsorshipApplicationLimits": {
    ".read": false,
    ".write": false
  }
}
```

## Critical security conditions

- Firebase Admin SDK bypasses Realtime Database security rules. Only the
  reviewed Cloud Function may create applications and rate-limit entries.
- Do not enable public client writes to either node.
- Existing broader parent-level `.read` rules can override the child
  restriction: review all ancestors (including the root) before deployment.
- Admin access must be enforced by Firebase rules, not just a UID check in
  browser JavaScript. Test a non-admin authenticated user and an anonymous
  user for permission denial.
- This draft deliberately allows **no** client status updates. A secure,
  separately authorised status-update flow must be designed and tested first.
- The admin dashboard remains disabled pending these checks.
