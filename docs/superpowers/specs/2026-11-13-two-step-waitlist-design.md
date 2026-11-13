# ARKVD two-step waitlist

Approved in chat on 2026-11-13: collect email first and save it immediately; then offer optional first name, last name and how the person heard about ARKVD. Offer Save details and Skip for now. Keep the existing orange/navy design and both signup placements.

## Approaches
- Chosen: email first, optional details second. Preserves the shortest possible signup and retains incomplete signups.
- Alternative: require all fields in one form. Collects complete records but adds friction before saving the email.

## Implementation decisions
Extend the existing Next.js site and Resend integration. Use the current global Contacts API and an explicitly configured waitlist segment. Create the heard_about and heard_about_detail string properties once during setup. Keep names in Resend's standard fields. No extra email is sent, preserving the site's existing promise.

Only the form used to join shows the details step; both forms share final signup state. Display errors without discarding inputs or the saved email. Use visible labels, autocomplete, keyboard-accessible referral choices and mobile layouts. No account or password required.

Do not claim success when storage is unconfigured or Resend rejects a request. Protect optional updates using a short-lived signed token bound to the newly created contact. Repeat signups must not overwrite existing names or subscription preferences. No public list or admin interface is added.

## Limits
GitHub connector access is read-only and local GitHub credentials are invalid. Prepare and verify changes locally, package source and a patch for handoff; publication needs working repository/deployment access and Resend configuration. Do not create an unrelated hosted Site.
