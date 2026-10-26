# HTML email

Relationship messages can be composed as rich HTML while every recipient also
receives a plain-text alternative. This document covers what members can write,
how content is stored and delivered, and the security boundaries.

## What members can format

The message composer is a rich-text editor. It supports:

- bold, italic, and underlined text
- bulleted and numbered lists
- links using `http`, `https`, or `mailto`
- remote images using an `https` URL

There is no image upload, attachment control, inline `cid:` image support, CSS
editor, or HTML template gallery.

## Storage and limits

Each draft stores:

- `messages.body` — the plain-text alternative, required
- `messages.body_html` — the sanitized HTML, nullable for legacy messages

New HTML drafts derive the plain-text alternative on the server from the
sanitized HTML. A message created before HTML support keeps `body_html = NULL`
and is sent text-only until it is edited and saved again.

| Field | Limit |
| --- | --- |
| Subject | 200 characters |
| HTML body | 50,000 characters, before and after sanitization |
| Plain-text alternative | 10,000 characters |

A body with no readable text is rejected. Images alone are not sufficient
content.

## Sanitization

Sanitization runs in `src/lib/messaging/html.ts` on the server when a draft is
saved and again immediately before delivery. The second pass protects against
messages altered outside the application.

Allowed tags: `p`, `br`, `strong`, `b`, `em`, `i`, `u`, `s`, `ul`, `ol`, `li`,
`a`, and `img`.

- Links may use `http`, `https`, or `mailto`; links with other schemes or relative
  URLs lose their `href` and keep their text.
- Links receive `rel="noopener noreferrer"`.
- Images must use an `https` URL. Images with `http`, `data`, `cid`, protocol
  relative, or relative sources are removed.
- `script`, `style`, `iframe`, `form`, event-handler attributes, `style`
  attributes, classes, ids, and unsupported attributes are removed.
- HTML is never rendered in the CRM with `dangerouslySetInnerHTML`; the draft
  page sanitizes stored HTML before Tiptap loads it.

## Merge fields

`{{firstName}}`, `{{lastName}}`, and `{{company}}` work in both the HTML and text
versions. Unknown placeholders are rejected at save time. Values are
HTML-escaped in the HTML part, so a company named `Smith & Sons` is delivered as
`Smith &amp; Sons` in HTML and `Smith & Sons` in text.

Placeholders must be plain text. A placeholder broken up by formatting markup is
rejected rather than silently left unreplaced.

## Delivery

When `body_html` is present, the transport receives both the rendered HTML and
the rendered text alternative. Nodemailer sends them as
`multipart/alternative` when the rendered text is non-empty. If the rendered
text is empty, or a damaged HTML body sanitizes to nothing, the HTML part is
omitted rather than sending HTML without a text part.

Legacy messages with `body_html = NULL` continue to send only `text`.

## Privacy and operational notes

- The CRM does not fetch remote image URLs server-side. There is no image proxy
  and no SSRF surface from this feature.
- The composer loads remote images in the author's browser; recipients' email
  clients decide whether to load them.
- Drafts are shared with the workspace. Any member who opens a draft also loads
  its remote images, so an image URL can reveal viewer metadata to its host. Only
  use image sources you trust.
- Remote images can act as tracking pixels. Open and click tracking are not part
  of this feature.
- Emails use semantic HTML only. There is no inline CSS, responsive email
  framework, or cross-client rendering guarantee beyond that subset.
- SMTP configuration is unchanged: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
  `SMTP_USER`, `SMTP_PASSWORD`, and `MESSAGING_FROM`.

## Out of scope

Attachments, uploads, inline images, reusable HTML templates, marketing campaign
HTML, open/click tracking, and public API changes are not part of this feature.
