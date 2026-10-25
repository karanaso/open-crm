# Design

## Context

See `proposal.md` for motivation. The constraints that shape this design:

- Server Components read; Server Actions mutate. Services in `src/lib/services/` never import UI code and return locale-independent error descriptors. Zod schemas in `src/lib/validation/` are the shared contract.
- Deployment is a single Next.js container plus PostgreSQL. There is no queue, worker, cron, or job table today, and API routes are limited to auth, health, search, and the public listings API.
- There is no outbound email infrastructure at all: invites and password resets return their URLs to the UI instead of emailing them. This change introduces the first outbound dependency and the first third-party secret.
- `src/lib/services/marketing.ts` already contains `segmentWhere(criteria)`, audience evaluation capped at 5,000, and the activation pattern (row lock, freeze, `onConflictDoNothing`) used by campaigns. That pattern is reused; `campaign_recipients` is not.
- Contacts are archive-only, have a required globally unique `email`, and an optional unvalidated `phone`. Companies have no email column.
- Tests: unit tests run in jsdom, integration tests run serially against real PostgreSQL, and E2E prepares its database by replaying `drizzle/*.sql` in order. A new migration file is picked up automatically.

## Goals / Non-Goals

**Goals:**

- One auditable sending path with a per-recipient record that survives contact edits and source changes.
- Reuse the existing segment predicate and snapshot precedent rather than duplicating audience logic.
- No new infrastructure: no worker, queue, cron, API route, or public surface.
- Test suites that can never reach a real SMTP server, even with a populated `.env.local`.

**Non-Goals:**

- SMS delivery, HTML bodies, templates, scheduling, attachments, and open/click tracking.
- Bounce handling, provider webhooks, and unsubscribe pages.
- Company recipients.
- Campaign integration. A message does not write `campaign_recipients`.

## Decisions

### 1. Separate capability and separate tables

Campaigns model a marketing initiative: channel, budget, dates, lifecycle, and a human-recorded engagement funnel whose metrics are specified. A message models one send: content, a frozen audience, and machine-recorded transport outcomes. Reusing `campaign_recipients` would put two meanings in one `status` enum and force the campaign metrics contract to explain machine states it was not designed for.

**Alternatives rejected:** extending `campaigns` with delivery columns (breaks the manual-tracking contract); a `message_recipients` view over campaign recipients (no campaign required for a one-off email).

### 2. Schema

```
message_groups                          message_group_members
+-------------------------------+       +----------------------------------+
| id uuid pk                    | 1   n | group_id  fk cascade             |
| name text not null            |-------+ contact_id fk cascade            |
| description text              |       | added_by_id fk set null          |
| created_by_id fk restrict     |       | created_at                       |
| archived_at timestamptz       |       | pk (group_id, contact_id)        |
| created_at, updated_at        |       | index (contact_id)               |
+-------------------------------+       +----------------------------------+

messages                                message_recipients
+-------------------------------+       +----------------------------------+
| id uuid pk                    | 1   n | id uuid pk                       |
| channel enum('email')         |-------+ message_id fk cascade            |
| status enum                   |       | contact_id fk restrict           |
| subject text not null         |       | address text not null            |
| body text not null            |       | status enum                      |
| group_id fk nullable          |       | reason enum nullable             |
| segment_id fk nullable        |       | provider_message_id text         |
|   check num_nonnulls(g,s)=1   |       | attempted_at timestamptz         |
| audience_snapshot jsonb       |       | created_at                       |
| created_by_id fk restrict     |       | unique (message_id, contact_id)  |
| sent_at, completed_at         |       | index (message_id, status)       |
| run_started_at                |       | index (contact_id)               |
| created_at, updated_at        |       +----------------------------------+
+-------------------------------+

contacts + email_opt_out_at timestamptz nullable
```

Decisions inside the model:

- **`address` is snapshotted** at freeze time. A contact's email can change after the send; the record must state where the message actually went. Names are joined from `contacts`, which is safe because contacts are archived rather than deleted.
- **`reason` is a closed enum** (`opted_out`, `archived`, `missing_email`, `cancelled`, `auth`, `connection`, `timeout`, `rejected`, `unknown`). It is nullable and required only for `failed` and `skipped`. Closed values are translatable and testable; raw SMTP responses are not persisted.
- **No `audience_kind` column.** Exactly one of `group_id` and `segment_id` is set by check constraint, and `audience_snapshot.kind` records what was used. Two sources of truth are avoided.
- **`contact_id` uses `restrict`** so delivery history cannot be erased. The application has no hard delete for contacts today; this makes the guarantee explicit.
- **`email_opt_out_at` is a timestamp, not a boolean**, so the UI can show since when and audits have a value. Null means eligible.
- **`channel` exists with a single value.** SMS is an explicit next phase; adding the value later is trivial, but retrofitting a channel-dependent subject/address shape is not.

Type additions in `src/lib/types.ts`: `MessageAudienceSnapshot` (`{ kind: "group" | "segment"; name: string; criteria?: SegmentCriteria }`), plus inferred enum types.

### 3. Audience resolution reuses the segment predicate

`segmentWhere` is exported from `src/lib/services/marketing.ts` and used by a new query in `services/messaging.ts` that projects only the fields eligibility needs.

```
group audience    : message_group_members join contacts
segment audience  : contacts left join companies where segmentWhere(criteria)
```

**Alternative rejected:** copying the predicate into messaging (drift risk); extracting a shared `segments` service (larger refactor, no behavior gain here).

Eligibility is uniform and ordered:

```
archivedAt != null        -> skipped/archived
email blank               -> skipped/missing_email
emailOptOutAt != null     -> skipped/opted_out
otherwise                 -> queued
```

Because `segmentWhere` already excludes archived contacts, segment audiences never contain archived skips; static groups can. That asymmetry is intentional and stated in the UI counts. Every audience member gets a recipient row, including skipped ones, so "why wasn't this person emailed?" has an answer.

### 4. Freeze and send orchestration

```
send(messageId, actorId, transport = getTransport())
  |
  +-- preflight: transport configured?  no -> MESSAGING_NOT_CONFIGURED
  |
  +-- TX1 ------------------------------------------------------------
  |   select message for update
  |   require status = draft
  |   resolve audience rows
  |   classify -> queued | skipped(reason)
  |   eligible = count(queued)
  |   eligible = 0            -> NO_ELIGIBLE_RECIPIENTS
  |   eligible > cap          -> RECIPIENT_LIMIT_EXCEEDED(limit)
  |   update message: status=sending, audience_snapshot, run_started_at
  |   insert recipients on conflict do nothing
  +--------------------------------------------------------------------
  |
  +-- loop outside any transaction, one transport for the run
  |     select recipients where status=queued order by created_at, id
  |     render body for the contact
  |     transport.send(...)
  |        ok    -> sent, provider_message_id, attempted_at
  |        error -> failed, reason, attempted_at; continue
  |     (abort only on auth/connection; remaining stay queued)
  |
  +-- finalize: if no queued remain -> completed, completed_at
```

The transaction must not span network I/O. `FOR UPDATE` serializes two tabs sending the same draft; the loser sees `INVALID_MESSAGE_STATE`.

A `run_started_at` marker serializes runs beyond the freeze. The send sets it inside the freeze transaction, and retry only claims a message whose marker is null or older than 30 minutes. The marker is cleared when a run completes or aborts in an orderly way; a process crash leaves it set until the stale window passes, so a second run cannot duplicate an in-flight delivery. The audience is resolved before the transaction, so the transaction never needs a second pooled connection.

A hard abort leaves the message in `sending` with queued rows, which is exactly the resumable state the spec describes. No automatic retry is added.

### 5. Retry and cancel

```
        +---------- send ----------> +---------+
        |                            | sending | --- all terminal ---> completed
     draft                           |         |
        |                            +---------+
        |                              |     |
        |                           cancel  retry (queued|failed)
        |                              v     v
        |                          cancelled  sending
        |
        +---- edit (draft only)
```

- Retry locks the message, requires `sending` or `completed`, claims the run marker, and attempts only `queued` and `failed` rows. A concurrent retry receives `SEND_IN_PROGRESS`. `sent` and `skipped` rows are never touched.
- The delivery loop re-reads the message status before each recipient and stops when the message is `cancelled`; recipient updates are conditional on the row still being `queued` or `failed`, so a cancel cannot be overwritten by an in-flight run.
- Every attempt re-checks the contact's current do-not-email and archived state, so a contact who opts out after the freeze is stored as skipped instead of being sent to.
- Cancel is allowed only from `sending`; it marks remaining `queued` rows `skipped/cancelled` and sets the message `cancelled`. This gives operators a way to close a message stuck after a crash.
- A message in `completed` with zero failed/queued rows has no retry action in the UI.

### 6. Transport abstraction and configuration

```ts
interface EmailTransport {
  send(message: OutboundEmail): Promise<{ providerMessageId?: string }>;
}
```

- `getTransport()` returns the SMTP adapter in normal server use and a fake when `NODE_ENV === "test"` or `MESSAGING_TRANSPORT=fake`. The test check comes first and cannot be overridden by SMTP vars, so unit, integration, and E2E runs can never send real mail.
- Services accept an optional transport argument (`sendMessage(id, actorId, transport)`), so integration tests inject a fake with scripted per-recipient results without global mutable state.
- SMTP is configured with `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional `SMTP_USER`/`SMTP_PASSWORD`, required `MESSAGING_FROM`, and `MESSAGING_MAX_RECIPIENTS` (default 100). `isMessagingConfigured()` requires host and from, and requires the password when a user is set. SMTP credentials are read only in the server transport module and never passed to a component or returned in action state.
- One pooled transport per run, closed in `finally`. Per-recipient `connectionTimeout`, `greetingTimeout`, and `socketTimeout` are bounded so one stalled recipient cannot consume the whole request.
- Nodemailer errors map to `reason`: `EAUTH -> auth`, `ECONNECTION|ESOCKET|EDNS -> connection`, `ETIMEDOUT -> timeout`, `EENVELOPE -> rejected`, otherwise `unknown`. `auth` and `connection` abort the run; the rest are per-recipient failures.
- `Reply-To` is the signed-in member's email so replies reach the author; `From` is `MESSAGING_FROM`. Both are set server-side and never accepted from the form.
- Authenticated SMTP requires STARTTLS unless `SMTP_ALLOW_PLAINTEXT=true` is set for a trusted local relay. The fake transport is ignored when `NODE_ENV=production`, so a leftover demo value cannot silently suppress delivery.
- **Alternative rejected:** a hosted provider SDK (Resend/Postmark). Generic SMTP works with any provider or a local relay and keeps the self-hosted deployment portable; the cost is a weaker typed API and no idempotency key, mitigated by the recipient unique index.

### 7. Rendering and headers

- `renderMergeFields(body, contact)` is a pure function with a single pass over `{{firstName}}`, `{{lastName}}`, `{{company}}`. Missing values become empty strings. Unknown placeholders are rejected at save with a field error; a stray `{{` is plain text.
- Bodies are sent as `text/plain` only. Newlines are preserved. Because there is no HTML part, contact data cannot inject markup and no escaping layer is required.
- Subject rejects `\r` and `\n` through Zod to prevent header injection; body allows newlines and is capped at 10,000 characters.
- The rendered body is never stored per recipient. Only the shared draft body is stored, plus the address and outcome per recipient.

### 8. Opt-out and contact history

- The contact form and detail page expose a single do-not-email toggle backed by `email_opt_out_at`. All active members can set and clear it; the spec requires the contact to remain in directory lists, segments, and campaigns.
- Contact history reads `message_recipients` joined to `messages`, filtered by `contact_id`, ordered by `messages.created_at desc`, limited to the ten most recent, and shows the recipient outcome and reason. It is read-only and link-only.
- **Alternative rejected:** logging an `email` activity per recipient. It would create up to 100 activity rows per send, duplicate the body into the timeline, and pull message lifecycle into the activity editing rules.

### 9. Authorization, caps, and safety

- Every page uses `requireUser()`; every action uses `requireUserForAction()`, matching existing modules. Inactive users are rejected by the session guard before any service call.
- The cap is checked against eligible recipients before any row is created and is surfaced in the confirmation dialog along with total, eligible, and ineligible counts.
- Sending and retry are `useActionState` form actions with a disabled submit and a pending indicator. Double submission is additionally prevented by the `FOR UPDATE` status check.
- No scheduling, no background continuation, and no per-user rate limit. The cap is the blast-radius control.
- New error codes: `NO_ELIGIBLE_RECIPIENTS`, `RECIPIENT_LIMIT_EXCEEDED` (with a `limit` param), `MESSAGING_NOT_CONFIGURED`, `INVALID_MESSAGE_STATE`.

### 10. UI, routing, and localization

| Route | Purpose |
| --- | --- |
| `/messages` | list, status filter, subject search, pagination |
| `/messages/new` | compose a draft |
| `/messages/[id]` | draft: edit + audience summary + send; sent: summary + recipient table + retry/cancel |
| `/messages/groups` | group list |
| `/messages/groups/new` | create group |
| `/messages/groups/[id]` | rename, archive, add/remove members |

- A new `Messages` item is added after Campaigns in `NAV_ITEMS` with a `Mail` icon.
- Catalog namespace `messaging`, plus `enums.messageStatus`, `enums.deliveryStatus`, and `enums.outcomeReason` in both catalogs. Merge-field tokens are technical identifiers and are not translated. Dates use `src/i18n/format.ts`.
- The recipient table renders outcome and reason with badges, mirroring `RecipientStatusBadge`.

### 11. Testing strategy

| Layer | Coverage |
| --- | --- |
| Unit | merge-field rendering (all fields, missing values, unknown token rejection), subject CR/LF rejection, body length, error-code mapping |
| Integration | group membership, segment and group freeze, skip classification order, cap and empty-audience rejection, unique/idempotent inserts, lifecycle transitions, retry only queued/failed, cancel, opt-out persistence, contact history ordering |
| E2E | create group, compose, confirm counts, send with fake transport, see outcomes, retry, opt-out removes eligibility |
| A11y | `/messages/new`, `/messages/[id]`, `/messages/groups` added to the existing axe journey |
| Catalogs | `pnpm i18n:check` after adding English and Greek keys |

Integration tests call services directly with a `FakeTransport` seeded with results, and assert that skipped recipients never reach it. E2E runs with `MESSAGING_TRANSPORT=fake` set by the web server environment.

## Risks / Trade-offs

- **No delivery or bounce visibility** -> the UI labels the state "sent" (accepted), documents the limitation, and phase 2 adds signed provider webhooks.
- **Request-bound sending** -> cap of 100, bounded SMTP timeouts, one pooled connection, and a resumable `sending` state. A reverse proxy with a short timeout could still cut a run; remaining rows stay queued.
- **Crash mid-send leaves a message in `sending`** -> retry and cancel actions are both available and both take the row lock.
- **Concurrent retry from two tabs** -> `SELECT ... FOR UPDATE` plus terminal-state filtering prevents duplicate sends.
- **Deliverability depends on the operator** -> README documents SPF, DKIM, DMARC, and the sender-address requirement; the app does not verify DNS.
- **Consent is manual** -> the opt-out flag records decisions the team receives elsewhere; there is no automated unsubscribe and no consent audit trail. Documented as a limitation of relationship-email scope.
- **Static groups can drift from intent** -> archived and opted-out members are shown as skipped, not silently dropped, so the gap is visible.
- **Secrets in process environment** -> read only in the server transport module, never logged, never serialized; errors are stored as codes, not provider responses.
- **Message channel enum has one value** -> accepted as a deliberate forward-compatibility cost for the SMS phase.

## Migration Plan

1. Generate two additive Drizzle migrations: the messaging tables and contact column, then the run marker. All changes are additive; no backfill.
2. Run `pnpm db:migrate` against development, integration, and E2E databases before starting the app.
3. Add the SMTP and messaging variables to `.env.example` and the README. Existing deployments start with messaging unconfigured: pages load, drafts save, and sending returns a configuration error.
4. Rollback: revert the application; the tables and column are inert. Dropping them requires a manual migration and loses message history, which is acceptable only if the feature was never used.

## Open Questions

- Draft deletion: the spec defines no delete action, so v1 leaves drafts in the list. Adding a delete for drafts only would not change any spec requirement.
- A rendered preview of the first recipient: useful for merge-field confidence, but deferred because it adds a client-side sample-data path.
- Surfacing messages in global search and the dashboard: deferred; neither changes messaging requirements.
