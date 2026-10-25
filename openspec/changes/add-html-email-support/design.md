# Design

## Context

See `proposal.md` for motivation and `specs/outbound-messaging/spec.md` for the behavior contract.

Current state that shapes the approach:

- `messages.body` is required plain text. Drafts are edited through a `<textarea>` in `src/components/messaging/message-form.tsx`.
- `src/lib/services/messaging.ts` creates and updates messages, freezes the audience at send time, and passes `{ text }` to an `EmailTransport`.
- `src/lib/messaging/smtp.ts` sends only `text` through Nodemailer. `FakeTransport` records attempts and is the test transport.
- Merge fields are a regex replacement over plain text in `src/lib/messaging/render.ts`.
- Validation is in `src/lib/validation/messaging.ts`; Server Actions re-validate and services do not return display strings.
- UI catalogs are `messages/en.json` and `messages/el.json`. The editor adds user-facing strings.
- The schema is additive-friendly: `messages` already has a nullable JSON snapshot and text columns, with Drizzle-generated migrations in `drizzle/`.

## Goals / Non-Goals

**Goals:**

- Author, persist, sanitize, and deliver HTML email while keeping a plain-text alternative.
- Preserve every existing plain-text draft and message without a data backfill.
- Keep the existing audience, freeze, retry, cancel, recipient-cap, and delivery-outcome behavior unchanged.
- Keep all HTML handling server-authoritative and testable outside React.

**Non-Goals:**

- Attachments, image uploads, inline `cid:` images, or any file storage.
- Open/click tracking, tracking pixels, email templates, a CSS/style editor, or a full email builder.
- HTML campaigns; campaign delivery remains out of scope in this version.
- A new read-only message-body viewer or changes to the message list/detail layout.
- Cross-client email rendering QA beyond semantic, client-safe HTML.
- API route changes, public API changes, auth changes, or multi-tenancy changes.

## Decisions

### 1. Add a nullable HTML column; keep `body` as the text alternative

Add `bodyHtml: text("body_html")` to `messages`, nullable, immediately after `body`.

- New HTML drafts store both the sanitized HTML and the server-derived plain-text alternative.
- Legacy messages keep `body` and a `NULL` `body_html`; they remain valid and are sent text-only until edited.
- The presence of `body_html` selects HTML delivery. No `format` enum and no backfill are needed.
- `body` stays required, so existing queries, list views, and send paths cannot receive a message without text.
- Because the HTML column can be large, `listMessages` must stop selecting whole `messages` rows and select only the summary columns the list uses; neither `body` nor `bodyHtml` is needed there.

Limits: the submitted HTML may be at most 50,000 characters; the stored sanitized HTML must also fit that limit, and the stored text `body` remains capped at 10,000. Both are enforced in validation and again in the service. Database columns stay `text` and rely on app validation, matching the existing `body` column rather than introducing a new check constraint.

**Alternatives considered:** storing HTML in `body` with a `body_format` enum. Rejected because every existing row needs interpretation, the text length contract becomes ambiguous, and a failed save could lose the fallback. A separate nullable column is additive and easy to roll back.

### 2. Sanitize with `sanitize-html` on the server, twice

Create a server-only module, `src/lib/messaging/html.ts`, that owns sanitization, text derivation, legacy text conversion, and placeholder inspection. Merge rendering stays in `src/lib/messaging/render.ts`. `html.ts` must not be imported by client components.

Allowlist:

- Tags: `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `ul`, `ol`, `li`, `a`, `img`.
- Link attributes: `href`, `title`, `target`, `rel`. Links may use `http`, `https`, or `mailto`; links with other schemes or relative URLs lose their `href` and keep their text. A transform sets `rel="noopener noreferrer"`.
- Image attributes: `src`, `alt`, `width`, `height`. Image sources must use `https`.
- No `style`, `class`, `id`, event-handler, `data-*`, `script`, `iframe`, `form`, `input`, `object`, or `embed` content.
- Protocol-relative URLs are disabled. `data:` and `cid:` are not allowed for links or images.
- Images whose `src` is absent or not permitted are dropped entirely rather than left as broken tags.

Sanitize on draft save and again immediately before building a transport attempt. The second pass protects against rows altered outside the application and keeps the transport boundary clean. Sanitization must be idempotent.

**Alternatives considered:** DOMPurify with a server DOM shim. Rejected because it adds a jsdom runtime and a larger dependency for a server-only job. A hand-written sanitizer is not acceptable for untrusted HTML.

### 3. Derive the plain-text alternative on the server

Use `html-to-text` over the sanitized HTML to produce the stored `body`:

- Disable word wrapping and preserve paragraph/line breaks.
- Render list items and block boundaries as newlines.
- Render links as readable text and keep meaningful image alt text.
- Trim the result and reject a save when there is no readable text. Images alone are not sufficient content.
- Reject a save when the derived text exceeds 10,000 characters.

The stored `body` is the fallback used at send time. Deriving on the server prevents trusting a hidden client field and gives the same result for actions, tests, and future callers.

**Alternatives considered:** submitting `editor.getText()` from the browser. Rejected as the source of truth because it is client-controlled and can diverge from the stored HTML. `html-to-text` is also more predictable than a small regex-based stripper.

### 4. Keep merge fields in one text/HTML pipeline

- Validate unknown placeholders against both the sanitized HTML and its text projection, so an unknown placeholder in a link or image attribute is still caught.
- Detect supported placeholders split by markup by comparing occurrences in the sanitized HTML with occurrences in the text projection. A formatted placeholder such as `{{<strong>firstName</strong>}}` is rejected with its field name rather than silently left unreplaced.
- Render HTML by replacing placeholders in the sanitized HTML with HTML-escaped values (`&`, `<`, `>`, `"`, `'`). Replacing within allowed attributes is safe because values are escaped, and it supports links containing merge fields.
- Render plain text with the existing `renderMergeFields` behavior. Missing values remain empty strings.
- Keep the existing `findUnsupportedMergeFields` and `renderMergeFields` helpers; extend, do not rewrite, their semantics.

The new validation key for split placeholders is a field error on the body, translated at the UI boundary.

### 5. Send both alternatives through the existing transport abstraction

Extend `OutboundEmail` with optional `html?: string`.

- `deliverRecipients` sanitizes `message.bodyHtml` once per run, renders merge fields per recipient, and sends `{ text, html }`.
- If the stored HTML sanitizes to empty at delivery, the HTML part is omitted and the text part is sent; this keeps a damaged row from producing an empty HTML alternative.
- The text part is the rendered stored `body`; the HTML part is the rendered sanitized template.
- Legacy messages pass only `text`; `html` is omitted, not sent as an empty string.
- `createSmtpTransport` passes `html: email.html` to Nodemailer, which produces `multipart/alternative` when both parts exist.
- `FakeTransport` records the optional `html` field so integration tests can assert both parts.
- No delivery/outcome semantics change: "sent" still means transport acceptance only.

### 6. Use Tiptap for authoring, not raw HTML

Add a client component, `src/components/messaging/rich-text-editor.tsx`, built on Tiptap 3 with `StarterKit` and `@tiptap/extension-image`.

- Toolbar: bold, italic, underline, bulleted list, numbered list, link, remove link, image, undo, redo.
- StarterKit's link extension is configured to be inactive on click and to allow `http`, `https`, and `mailto`.
- The image extension disallows base64. The image dialog requires an `https://` URL and offers optional alt text. There is no upload control.
- The link dialog edits the current selection; a new link uses the selected text or the URL as its label.
- `immediatelyRender: false` avoids Next.js hydration mismatch. The editor gets `id="body"`, `role="textbox"`, `aria-multiline`, and a translated accessible name so the existing `FormField` label and error association keep working.
- The editor writes its current HTML into a hidden `bodyHtml` input initialized from the editor content, including converted legacy text. The form no longer submits a plain-text textarea. All toolbar and dialog buttons are non-submit buttons so they cannot submit the message form.
- The editor's schema strips unsupported pasted nodes, but the server sanitizer remains authoritative. Blockquotes, headings, inline code, code blocks, and horizontal rules are disabled so the editor schema matches the sanitizer allowlist.
- The draft page re-sanitizes stored HTML before handing it to the editor, and the editor never uses `dangerouslySetInnerHTML`. If stored HTML is absent or sanitizes to empty, the page falls back to the converted plain-text body.
- Add only minimal scoped CSS for paragraph spacing, lists, links, image max-width, and focus. Do not add a CSS-inlining or email-templating layer.

`message-form.tsx` keeps the subject and audience controls unchanged, passes `initialHtml` (or a server-converted legacy body) into the editor, and shows body errors from the existing `FormField`. The message detail page passes sanitized stored `bodyHtml` to the form for drafts; otherwise it converts legacy `body` with an escaping newline-to-paragraph helper.

**Alternatives considered:** raw HTML textarea plus preview. Rejected by the user because it requires HTML knowledge. Lexical was considered; Tiptap's schema-controlled HTML output and small React integration make it the smaller fit. Native `contentEditable` avoids a dependency but makes selection, paste sanitization, and keyboard behavior too fragile.

### 7. Validation and service flow

- `messageSchema` accepts `body` (plain text, optional) and `bodyHtml` (optional), requires exactly one non-empty body source, and keeps the existing subject and audience rules.
- A shared server helper inspects a submitted body pair: sanitize, derive text, check unknown/split placeholders, empty content, and length. Server Actions use it to return `fieldErrors.body` before calling the service.
- `createMessage` and `updateMessage` call the same normalization internally, so direct service callers and tests cannot bypass sanitization. If both body sources are supplied to the service, HTML wins and the text alternative is re-derived. Invalid bodies throw `AppError`; no user-facing display string is returned from the service.
- Actions continue to return locale-independent descriptors. The editor and `FormField` translate them.
- No new error code is needed for normal validation; existing `BAD_REQUEST` covers defensive service failures.

### 8. Dependencies and bundle boundaries

Add direct dependencies (versions checked on 2026-10-25):

- `@tiptap/core@3.32.0`, `@tiptap/react@3.32.0`, `@tiptap/pm@3.32.0`, `@tiptap/starter-kit@3.32.0`, `@tiptap/extension-image@3.32.0` (pinned together because Tiptap peer dependencies require matching versions)
- `sanitize-html@^2.18.1`, `html-to-text@^9.0.5`
- Dev: `@types/sanitize-html@^2.16.2`, `@types/html-to-text@^9.0.4` (`html-to-text` v9 ships matching declarations; v10 does not)

`sanitize-html` 2.18.1 declares Node `>=22.12.0`; the repository Dockerfile already builds on `node:22-bookworm-slim`, so implementation must confirm the deployed 22.x image is at least 22.12 before merging. No application Node version change is introduced.

Tiptap ships only in the messaging client chunk. `sanitize-html` and `html-to-text` stay in server modules and must not be imported from `message-form.tsx`, the editor, or `src/lib/messaging/render.ts` (which is shared with tests).

### 9. Migration and rollout

- Generate one additive migration with `pnpm db:generate`: `ALTER TABLE messages ADD COLUMN body_html text;` (nullable, no default, no backfill).
- Apply the migration before deploying the new application code; old code ignores the new column, but new code selects it.
- No data migration is needed. Legacy drafts and sent messages keep `body_html = NULL`.
- Rollback: revert the application code first, then drop the column in a follow-up migration. Dropping the column permanently discards authored HTML, so it is not part of the normal rollback.
- The editor chunk and server dependencies are loaded lazily/normally through the existing build; no new route or runtime configuration is introduced.

## Risks / Trade-offs

- **Remote images allow tracking pixels and are often blocked by email clients** → Images are author-provided, limited to HTTPS, carry no server proxy, and no open/click tracking is added. The CRM never fetches image URLs server-side, so there is no SSRF surface; the composer does load them in the author's browser, and recipients' image-loading settings remain outside our control.
- **Sanitizer bypass or future allowlist drift** → Use a maintained allowlist library, re-sanitize before delivery, and test scripts, event handlers, schemes, and data URLs in unit and integration tests.
- **Merge placeholders split by formatting** → Detect and reject at save with a field-level message; also check placeholders in both HTML and text projections.
- **HTML rendering differs across email clients** → Emit only semantic tags, no CSS/style attributes, and keep the feature scoped to basic formatting, lists, links, and images.
- **Client bundle growth from the editor** → Load the editor only in the messaging form client chunk; keep sanitizer/converter packages server-only.
- **Derived text loses visual structure** → Configure block/list/link conversion and cover it with unit tests; reject content with no readable text.
- **Legacy line breaks change when converted** → Use an escaping paragraph/`<br>` converter with explicit unit tests and verify a legacy draft in E2E.
- **HTML and text limits diverge after merge rendering** → Enforce limits at save on the derived text; merge values add only recipient-specific content and are not re-validated per recipient, consistent with the existing plain-text behavior.

## Migration Plan

1. Add the dependencies and generate the additive `body_html` migration.
2. Apply the migration to the target database.
3. Deploy the code that reads and writes `body_html`; legacy rows continue to send text-only.
4. Roll back by reverting the deployment before dropping the column; the column is nullable and old code remains compatible.

## Open Questions

None. Rendering polish and exact email-client styling can be revisited after the semantic HTML path ships.
