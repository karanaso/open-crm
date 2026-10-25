# Tasks

## 1. Foundation

- [x] 1.1 Add `nodemailer` and `@types/nodemailer` to `package.json`; verify `pnpm install` and `pnpm typecheck` succeed and no other runtime dependency is introduced.
- [x] 1.2 Add the four enums, four tables, relations, check constraints, indexes, and `contacts.email_opt_out_at` to `src/db/schema.ts`, plus `MessageAudienceSnapshot` and the inferred enum types in `src/lib/types.ts`; verify `pnpm typecheck` passes and every table has the indexes named in `design.md`.
- [x] 1.3 Generate one Drizzle migration and apply it to the development database; verify `pnpm db:generate` emits a single additive SQL file and `pnpm db:migrate` completes without altering existing rows.

## 2. Sending core

- [x] 2.1 Implement `renderMergeFields` in `src/lib/messaging/render.ts`; verify unit tests in `tests/unit/messaging.test.ts` cover supported fields, missing values, unknown-token rejection, and newline preservation.
- [x] 2.2 Implement `EmailTransport`, `isMessagingConfigured`, and SMTP error-to-reason mapping in `src/lib/messaging/transport.ts`; verify unit tests cover every combination of host/from/user/password and every reason mapping.
- [x] 2.3 Implement the nodemailer adapter with one pooled transport per run and bounded connection, greeting, and socket timeouts, plus the always-succeeding fake; verify a unit test proves `NODE_ENV=test` selects the fake even when SMTP variables are present.
- [x] 2.4 Add the SMTP and messaging variables to `.env.example` and the README deployment section, including SPF/DKIM/DMARC, sender-address, and recipient-cap notes; verify the documented names match `isMessagingConfigured` exactly.

## 3. Domain services

- [x] 3.1 Export the segment predicate from `src/lib/services/marketing.ts` and add audience resolution plus eligibility classification to `src/lib/services/messaging.ts`; verify integration tests cover segment and group audiences, archived, opted-out, and missing-email cases with the recorded skip reason for each.
- [x] 3.2 Implement group create, update, archive, and membership add/remove; verify integration tests cover duplicate membership, archived groups disappearing from selection, member counts, and contacts remaining in the directory.
- [x] 3.3 Implement message draft create, update, get, and a paginated list with status filter and subject search; verify integration tests cover draft editability, rejection of a missing audience source, and pagination bounds.
- [x] 3.4 Implement send orchestration: row lock, audience freeze, snapshot, cap and empty-audience rejection, recipient insert, per-recipient loop, and finalize; verify integration tests cover partial failure continuing, auth/connection abort leaving queued rows, and idempotent inserts.
- [x] 3.5 Implement retry, cancel, and lifecycle guards; verify integration tests cover retry touching only queued and failed rows, cancel marking queued rows skipped, and a double send being rejected.
- [x] 3.6 Implement the contact opt-out update and contact message-history query; verify integration tests cover persistence across archive and restore, exclusion from eligibility, and newest-first history with outcome reasons.
- [x] 3.7 Update `AGENTS.md` to replace the email-delivery prohibition with a calendar-only prohibition and add Messaging to the module map; verify no remaining line claims the system cannot deliver mail.

## 4. Validation and Server Actions

- [x] 4.1 Add Zod schemas for groups, messages, audiences, and merge-field rules in `src/lib/validation/messaging.ts`; verify unit tests cover required subject and body, CR/LF rejection in the subject, the 200 and 10,000 character limits, and unsupported placeholders.
- [x] 4.2 Add the do-not-email Server Action that sets and clears the flag through the service from 3.6; verify `pnpm typecheck` passes and the action calls the session guard before reading input.
- [x] 4.3 Implement group and message Server Actions with `requireUserForAction`, descriptor errors, the new error codes, and return-path sanitization; verify `pnpm typecheck` passes and every action calls the guard before reading form data, confirmed by review.
- [x] 4.4 Add English and Greek entries for the new error and validation keys; verify `pnpm i18n:check` passes.

## 5. UI and localization

- [x] 5.1 Add the Messages navigation entry and build `/messages` with status filter, subject search, pagination, and an empty state; verify `tests/e2e/14-messaging.spec.ts` lists a created message and filters it by status.
- [x] 5.2 Configure the Playwright web server with `MESSAGING_TRANSPORT=fake`, then build `/messages/new` and the draft editor at `/messages/[id]` with merge-field help and a send confirmation showing total, eligible, and ineligible counts; verify E2E sends a draft through the fake transport and sees outcome counts.
- [x] 5.3 Build the sent-message view with the recipient table, outcome reasons, retry, and cancel; verify E2E confirms the sent view renders the recorded outcomes and shows retry and cancel only in allowed states.
- [x] 5.4 Build group list, creation, and member management pages; verify E2E creates a group, adds and removes a contact, and sees the updated member count.
- [x] 5.5 Add the do-not-email control and recent message history to the contact detail page; verify E2E toggles opt-out and sees that contact stored as skipped on the next send.
- [x] 5.6 Add English and Greek catalog entries for the `messaging` namespace, navigation label, enum labels, and page strings, plus glossary entries for new Greek terms; verify `pnpm i18n:check` passes.
- [x] 5.7 Add the messaging pages to the accessibility journey in `tests/e2e/08-a11y.spec.ts`; verify `pnpm test:e2e` reports no serious or critical axe violations.

## 6. Integration verification

- [x] 6.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, and `pnpm i18n:check`; verify all pass.
- [x] 6.2 Run `pnpm test:e2e`; verify the messaging journey and all existing journeys pass.
- [x] 6.3 Run `pnpm build`; verify the production build succeeds and includes the messaging routes.
- [x] 6.4 Perform a manual smoke against a local SMTP capture in English and Greek: confirm From, Reply-To, subject, merge fields, and per-recipient outcomes, and verify no credential appears in logs, page source, or action responses.

## Workflow follow-up

- Complete the security review of secrets handling, send authorization, and log leakage before merge.
- Archive the change after verification; archive syncs the deltas into the main specs.
- Do not push or open a pull request without explicit approval.

## 7. Security review follow-up

- [x] 7.1 Serialize send and retry runs with `messages.run_started_at`, release the marker on an orderly abort, and reject concurrent runs with `SEND_IN_PROGRESS`; verify the concurrent-retry integration test passes.
- [x] 7.2 Re-check do-not-email and archived state for every delivery attempt and stop the loop when a message is cancelled; verify the opt-out-after-abort integration test passes.
- [x] 7.3 Guard every messaging page with `requireUser` before data access and add `/messages/:path*` to the middleware matcher; verify typecheck and the E2E journeys.
- [x] 7.4 Require STARTTLS for authenticated SMTP with a documented escape hatch, ignore the fake transport in production, clamp the recipient cap, and bound list query inputs; verify unit tests.
