# Sponsorship and supporter membership upgrade

Development branch only. No live payment processing is enabled.

## Confirmed annual packages

Business sponsorship: Bronze £50, Silver £100, Gold £200, Platinum £350.

Supporter memberships: Free £0, Bronze £10, Silver £20, Gold £35, VIP £50.

## Manual payment workflow

1. Applicant chooses a package and submits an enquiry.
2. Server stores a pending application; applicant cannot write approval or entitlement fields.
3. Authorised administrator verifies payment outside the app.
4. Server-authorised approval activates a 12-month entitlement and records approver, payment verification time, start and expiry.
5. Membership benefits and badges are derived from trusted entitlement records, not client-submitted data.
6. Expired supporters retain their free account and earned achievement badges.

## Implementation safeguards

- Audit existing Firebase Functions and Realtime Database rules before deploying.
- Do not expose personal payment details in public profiles.
- Keep official team member claims and achievement badges separate from paid membership tiers.
- Preserve existing sponsor and supporter records.
- Do not enable PayPal or automatic charging.
- Validate changes in an isolated environment, then review before merging to main.

## Existing pages to integrate

- sponsorship-application.html
- admin-sponsorship-enquiries.html
- sponsors.html
- admin-sponsors.html
- supporter-account.html
- supporter-profile.html
- admin-supporters.html
- admin-badges.html

**Status:** Implementation planning only. Not deployed.
