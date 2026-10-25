# Proposal

## Why

Relationship email in OpenCRM currently sends only a plain-text body. Members cannot add basic formatting, links, or images, so messages look less professional than the rest of the product and cannot reference a listing or company page without pasting a bare URL. The messaging module is now established enough to support richer content without changing its delivery, audience, or audit model.

## What Changes

- Add a rich-text composer to message drafts with bold, italic, underline, bulleted and numbered lists, links, and remote HTTPS images.
- Store the authored HTML in a new nullable `messages.body_html` column while keeping `messages.body` as the plain-text alternative. Existing text-only drafts remain valid and are converted to HTML on their next save.
- Sanitize HTML on the server when a draft is saved and again before delivery. The allowlist permits formatting, lists, links (`http`, `https`, `mailto`), and images with `https` URLs. Scripts, styles, iframes, forms, event handlers, `data:`/`cid:` URLs, and unsupported attributes are removed.
- Send `multipart/alternative` email: the rendered HTML plus a generated plain-text alternative. Legacy messages without HTML continue to send text only.
- Apply `{{firstName}}`, `{{lastName}}`, and `{{company}}` merge fields in both representations, with values HTML-escaped in HTML. Unknown placeholders remain rejected.
- Update English and Greek UI catalogs for the editor, dialogs, hints, and validation messages.
- Add focused dependencies for the editor, server-side sanitization, and plain-text conversion.

Out of scope: attachments, image uploads or inline images, open/click tracking, reusable HTML templates, HTML for marketing campaigns (campaigns never send), and any public API change.

No user-facing breaking changes. Existing messages and drafts continue to open and send. The sanitizer dependency requires Node `>=22.12`, which matches the repository's Node 22 Docker baseline.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `outbound-messaging`: message composition gains rich HTML authoring; new requirements cover HTML sanitization, plain-text fallback, remote images, and multipart delivery; merge-field requirements extend to HTML content while preserving legacy text-only messages.

## Impact

- Database: one nullable `messages.body_html` column and migration; no backfill.
- Services and actions: message create/update normalize and sanitize HTML; delivery renders HTML and text together.
- Transport: `OutboundEmail` gains an optional `html` field; SMTP sends both alternatives when present.
- UI: new rich-text editor, link and image dialogs, and form integration; no route changes.
- Dependencies: `@tiptap/core`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `sanitize-html`, `html-to-text`, `@types/sanitize-html`, and `@types/html-to-text`.
- Tests: unit coverage for sanitization, HTML merge rendering, and text fallback; integration coverage for storage and multipart delivery; E2E coverage for composing formatted content; accessibility checks for the editor.
- Documentation and localization: messaging copy in `messages/en.json` and `messages/el.json`; Greek terminology reviewed against the existing glossary.
