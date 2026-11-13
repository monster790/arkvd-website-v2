# ARKVD website — two-step waitlist

The existing homepage now saves an email before offering optional first name, last name, and referral information. Both signup placements share state. Only the form used to join opens the details step. Saving or skipping finishes the flow; a failed details save preserves the email and all entered fields.

## Before deployment

1. In Resend, select or create the **ARKVD waitlist** segment. Copy its Segment ID; verify it includes the existing audience's contacts before switching production to this version. Do not assume an old Audience ID is the correct Segment ID.
2. Configure **RESEND_API_KEY** and **RESEND_SEGMENT_ID** as server-side environment variables in your hosting project. The API key must support Contacts, Segments and Contact Properties. A sending-only key is insufficient. The `.env.example` file contains blank placeholders; never commit real values or put them in `NEXT_PUBLIC_` variables.
3. Create two custom Contact Properties of type **string** in Resend: **heard_about** and **heard_about_detail**. Alternatively, with the API key in your environment, run `node scripts/setup-waitlist.mjs`. With a local `.env.local` and Node 22+, run `node --env-file=.env.local scripts/setup-waitlist.mjs`. The script only creates missing property definitions; it sends no emails and creates no contacts.
4. Deploy using the existing website host and framework settings. Keep the existing Next.js project root (`arkvd-web`) and build command (`npm run build`). The previous `RESEND_AUDIENCE_ID` variable is no longer consumed.
5. Verify a signup using an email you control. Confirm the email appears in the selected segment before completing optional details. Save the profile and confirm standard first/last name and custom referral properties in Resend. Test a second address with **Skip for now**. These final checks require actual production access and are not covered by local provider simulation.

Keep the existing production version until environment variables and property definitions are ready. Missing email-storage configuration returns a visible retryable error, rather than logging an address and pretending it was saved. Missing referral property definitions can cause the optional save to fail; the email is retained.

## Viewing the signup list

Use Resend's Contacts view, filter by your ARKVD waitlist segment, and inspect/export contacts there. Email, first name and last name use standard fields; referral uses `heard_about`, and additional text for Other uses `heard_about_detail`. This change does not create a public list or add an admin dashboard.

## Local development and checks

Use Node 22.12+ (or a supported newer release).

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run dev
```

The existing Google fonts require internet access during production builds. The tests simulate the external Resend boundary and make no real signups or email deliveries. API tests exercise actual route handlers; UI tests exercise the actual React forms. No Resend credential is needed to run tests.

## Behavior and protection

- Email is saved to Resend's current global Contacts API with waitlist segment membership before displaying success. No extra email is sent.
- Names and referral are optional. Labels, autocomplete, native radio choices, visible focus, 44px touch targets and mobile layouts are included.
- Newly created contacts receive a signed, 30-minute token for the optional profile save. The token lives only in page memory; no token, API key, or email is written to browser storage.
- Existing contacts get a success confirmation and are added to the waitlist segment without changing their names or subscription status. They do not get a public profile-edit form. Changing an existing contact requires a separate verified-email flow, outside this change.
- Provider errors, rate limits and network timeouts do not produce false success. Arbitrary 422 errors are no longer accepted as duplicates. Retry keeps the form values.
- The host's existing request protections still apply. Configure normal endpoint rate limits in your hosting provider before running a large public campaign.
- The original Next.js 16.3.8 dependency had a critical npm security advisory. This package upgrades Next.js and its matching ESLint config to 16.4.6 and refreshes compatible transitive dependencies.

## Scope and rollout

This package extends `monster790/arkvd-website-v2` on branch `codex/two-step-waitlist`. It is not a new hosted Site. Source code and automated checks are provided; production Resend configuration and deployment must happen through the existing hosting account. Never deploy the local QA provider used during browser testing.
