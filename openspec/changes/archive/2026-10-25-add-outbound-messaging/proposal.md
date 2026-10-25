# Proposal

## Why

The team already organizes contacts into segments and tracks campaigns, but every actual message is written and sent somewhere else. The CRM therefore cannot answer the two questions that matter for relationship work: "have we emailed this person, and when?" and "what exactly did we say?". Campaign engagement is recorded by hand after the fact, which makes the record lag reality and depend on someone remembering to update it.

This change deliberately revisits the earlier "no message delivery" decision. It keeps campaigns as manual planning-and-tracking records, and adds one narrow delivery path for plain-text, one-to-one relationship email so the team can write, send, and retain the message in the same place.

## What Changes

- Add a Messaging module with a message list, a compose form, a message detail view showing every recipient and its outcome, and management of static recipient groups.
- Support two audience sources per message: a hand-picked recipient group, or an existing segment evaluated at send time.
- Freeze the audience when a message is sent and retain the source name and criteria, following the campaign snapshot precedent.
- Send plain-text email with a subject and `{{firstName}}`, `{{lastName}}`, and `{{company}}` merge fields over operator-configured SMTP.
- Record a per-recipient delivery outcome (`queued`, `sent`, `failed`, `skipped`) with a failure or skip reason, and expose a "retry unsent" action for rows that did not complete.
- Add a per-contact do-not-email flag, default off, enforced at send time and adjustable by active members from the contact record.
- Show recent messages on the contact detail page so a member sees prior outreach in context.
- Amend the marketing campaign requirement so campaigns remain manual: activating a campaign still sends nothing and engagement statuses are still recorded by people. The system-level ban on delivery is removed, and Messaging becomes the only sending path.
- Document SMTP configuration, the recipient cap, deliverability responsibilities (SPF/DKIM/DMARC), and the absence of bounce feedback.

Explicitly out of scope for this change:

- SMS delivery. The message channel is modeled so it can be added later, but no SMS provider, phone validation, or phone-based audience is part of this change.
- HTML bodies, reusable templates, scheduling, drip sequences, attachments, and open/click tracking.
- Provider webhooks, bounce handling, and unsubscribe links. v1 has no new API routes and no new unauthenticated surface.
- Companies as direct recipients. A company is reached through its contacts; companies have no email field today.

## Capabilities

### New Capabilities

- `outbound-messaging`: recipient group management, message composition with merge fields, audience freezing, eligibility filtering, SMTP delivery with per-recipient outcomes, and retry of unsent recipients.

### Modified Capabilities

- `marketing-campaigns`: the "No message delivery" requirement is replaced. Campaigns keep every existing manual-tracking behavior, but the system-level prohibition on delivery is removed and ownership of sending moves to `outbound-messaging`.
- `crm-directory`: contact records gain a do-not-email state that members can set and clear, and the contact detail page gains a recent-message history section.

## Impact

- **Schema**: four new tables (`message_groups`, `message_group_members`, `messages`, `message_recipients`), four new enums (channel, message lifecycle, delivery status, outcome reason), one new `contacts` column, and a run marker on `messages`, in two additive Drizzle migrations.
- **Services and actions**: new `src/lib/services/messaging.ts`, `src/actions/messaging.ts`, `src/lib/validation/messaging.ts`; small contact read/write additions for the opt-out flag and message history.
- **UI**: new `/messages` routes, navigation entry, compose and group forms, recipient table; contact detail section and contact form control.
- **Delivery infrastructure**: new `src/lib/messaging/` transport abstraction with an SMTP adapter, an injectable fake transport for tests, and SMTP environment variables.
- **Dependencies**: `nodemailer` and `@types/nodemailer`. No other runtime dependency.
- **Configuration and docs**: `.env.example`, `README.md` deployment and marketing sections, and the `AGENTS.md` delivery constraint.
- **Localization**: new `messaging` message namespace, new navigation label, and new enum labels in English and Greek.
- **Operational**: sending is synchronous and capped, so no worker, queue, cron, API route, or public endpoint is introduced. The tradeoff is that a crash mid-send leaves a resumable message rather than automatic recovery.
