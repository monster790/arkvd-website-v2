# Two-step Waitlist Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Save ARKVD waitlist emails immediately, then collect optional names and referral details.
**Architecture:** Extend the existing shared React form state. POST saves a Resend contact in the configured segment and returns a signed update token; PATCH accepts only that token and optional validated details.
**Tech Stack:** Next.js 16, React 19, TypeScript, Resend HTTP API, Vitest and Testing Library.
**Spec:** docs/superpowers/specs/2026-11-13-two-step-waitlist-design.md

## Global Constraints
Preserve branding and both form placements. Optional fields never block signup. No outbound email. No credentials in source or browser storage. No success response without durable provider acceptance.

## Review Focus
- Missing configuration/provider errors must keep the email form retryable.
- A forged or expired token must not update contacts.
- Duplicate submissions must preserve existing profiles and subscription choices.
- Optional save failures must preserve email signup and entered details.
- Joining from the footer must not focus or open the hero's details form.

### Task 1: Persist signup and optional profile safely
Files: app/api/waitlist/route.ts, app/lib/waitlist-token.ts, app/lib/waitlist-fields.ts, tests/waitlist-api.test.ts.
Interfaces: POST {email, source} -> {ok:true, token?:string}; PATCH {token, firstName?, lastName?, heardAbout?, heardAboutDetail?} -> {ok:true}.
- [x] Add regression tests for missing configuration, malformed values, provider failures, duplicates, successful save/update, forged/expired tokens and omitted fields.
- [x] Run tests against the current endpoint and confirm expected failures.
- [x] Implement validation, current Resend Contacts calls, signed-token verification and honest error responses.
- [x] Run the API test suite.

### Task 2: Two-step form
Files: app/components/WaitlistForm.tsx, app/globals.css, tests/waitlist-form.test.tsx.
- [x] Write behavior tests for join -> details -> save, skip, failed join/save, footer activation and existing contacts.
- [x] Confirm new behavior tests fail against the original form.
- [x] Implement shared active-form state, optional fields, referral radios, retry/skip and keyboard focus.
- [x] Style in the existing palette with mobile touch targets and visible focus.
- [x] Run the complete tests, TypeScript and production build; inspect desktop/mobile in a local browser if available.

### Task 3: Setup and handoff
Files: .env.example, scripts/setup-waitlist.mjs, README.md.
- [x] Document Resend credentials, segment and custom-property setup, export path and rollout checks.
- [x] Review the diff for secrets and correctness; package source plus git patch and verification notes in outputs/.
