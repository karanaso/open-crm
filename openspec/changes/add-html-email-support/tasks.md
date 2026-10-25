# Tasks

## 1. Dependencies and data model

- [x] 1.1 Add the Tiptap, sanitizer, converter, and type packages listed in design.md to `package.json`; run `pnpm install` and verify `pnpm install --frozen-lockfile` succeeds with the updated lockfile, no peer-dependency warnings, and a Node runtime that satisfies `sanitize-html`'s `>=22.12` engine.
- [x] 1.2 Add nullable `bodyHtml` (`body_html`) to `messages` in `src/db/schema.ts`, run `pnpm db:generate`, and verify the generated migration contains only an additive nullable column and that a second `pnpm db:generate` reports no further schema changes.

## 2. Server HTML utilities

- [x] 2.1 Implement `sanitizeMessageHtml` in `src/lib/messaging/html.ts` with the allowlist and scheme rules from design.md; add unit tests in `tests/unit/messaging-html.test.ts` covering formatting, lists, links, HTTPS images, script/style/iframe/form/event-handler removal, dangerous and relative link schemes, non-HTTPS/relative image removal, and idempotence; verify with `pnpm test -- tests/unit/messaging-html.test.ts`.
- [x] 2.2 Implement `htmlToMessageText` and `plainTextToHtml` in `src/lib/messaging/html.ts`; add unit tests for paragraphs, line breaks, lists, link text, entity decoding, empty content, legacy text escaping, and legacy newline preservation; verify with `pnpm test -- tests/unit/messaging-html.test.ts`.
- [x] 2.3 Extend `src/lib/messaging/render.ts` with HTML merge rendering and split-placeholder detection; add unit tests for escaped values, missing values, unknown placeholders in HTML/text/attributes, split formatted placeholders, and link/image attributes; verify with `pnpm test -- tests/unit/messaging-html.test.ts`.
- [x] 2.4 Implement the server body inspector that sanitizes, derives text, validates placeholders, rejects empty content, and enforces the 50,000-character HTML and 10,000-character text limits; add unit tests for each rejection path; verify with `pnpm test -- tests/unit/messaging-html.test.ts`.

## 3. Validation, actions, and message service

- [x] 3.1 Update `messageSchema` in `src/lib/validation/messaging.ts` to accept exactly one non-empty `body` or `bodyHtml`, keep the subject/audience rules, and enforce both body limits; update unit tests for legacy text bodies, HTML bodies, missing/duplicate body sources, and over-limit values; verify with `pnpm test -- tests/unit/messaging.test.ts`.
- [x] 3.2 Update `src/actions/messaging.ts` to read both `body` and `bodyHtml`, run the body inspector before schema parsing, and return `fieldErrors.body` for unsupported/split placeholders and invalid bodies; verify with `pnpm lint` and `pnpm typecheck`.
- [x] 3.3 Update `createMessage` and `updateMessage` in `src/lib/services/messaging.ts` to normalize through the shared inspector, store sanitized HTML plus derived text, and preserve text-only legacy writes; add integration tests for HTML creation, sanitization, legacy compatibility, and rejection paths; verify with `pnpm test:integration -- tests/integration/messaging.test.ts`.
- [x] 3.4 Update `listMessages` to select only the message summary columns used by the list, excluding `body` and `bodyHtml`; confirm the existing list/filter/pagination integration tests and the messages page still pass; verify with `pnpm test:integration -- tests/integration/messaging.test.ts` and `pnpm typecheck`.

## 4. Delivery and transport

- [x] 4.1 Add optional `html` to `OutboundEmail`, pass it through `createSmtpTransport`, and record it in `FakeTransport`; add unit assertions for text-only and HTML attempts; verify with `pnpm test -- tests/unit/messaging.test.ts`.
- [x] 4.2 Update `deliverRecipients` to sanitize the stored HTML per run, render merge fields into HTML and text for each recipient, and omit `html` for legacy messages or when sanitization leaves no HTML; add integration tests for both parts, escaped merge values, text-only legacy delivery, and sanitization of tampered stored HTML; verify with `pnpm test:integration -- tests/integration/messaging.test.ts`.

## 5. Editor and page integration

- [x] 5.1 Build `src/components/messaging/rich-text-editor.tsx` with Tiptap, the toolbar, link/image dialogs, hidden `bodyHtml` input, legacy initial content, and accessible labels/roles; add scoped editor styles; verify with `pnpm lint` and `pnpm typecheck`, with editor behavior covered by the E2E task in 5.3.
- [x] 5.2 Replace the body textarea in `src/components/messaging/message-form.tsx` with the editor, wire `bodyHtml` errors into `FormField`, and update the new/detail message pages to sanitize stored HTML, fall back to converted legacy text when stored HTML is absent or sanitizes empty, and pass the result to the editor; verify with `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
- [x] 5.3 Update `tests/e2e/14-messaging.spec.ts` to type into the contenteditable editor, apply formatting, insert a link and an HTTPS image (stubbing the image request if needed), confirm no upload control is present, save, reopen, and assert the formatting, link, and image are retained before sending; verify with `pnpm test:e2e -- tests/e2e/14-messaging.spec.ts`.
- [x] 5.4 Extend `tests/e2e/08-a11y.spec.ts` to create a contact and recipient group, then cover `/messages/new` with the editor loaded; verify with `pnpm test:e2e -- tests/e2e/08-a11y.spec.ts`.

## 6. Localization and documentation

- [x] 6.1 Add all new English and Greek `messaging`/`validation` keys, update the plain-text descriptions that are now inaccurate, update `docs/i18n/glossary.md` for any new terms, and run the translator review; verify with `pnpm i18n:check` and `pnpm test -- tests/unit/i18n-catalog.test.ts`.
- [x] 6.2 Add `docs/messaging-email.md` describing supported formatting, limits, sanitization, HTTPS-only remote images, plain-text fallback, and the no-attachments/tracking boundary; verify the documented behavior matches the delta spec and the editor UI.

## 7. Integration verification

- [x] 7.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm i18n:check`; all pass.
- [x] 7.2 Run `pnpm test:integration` against `opencode_crm_test`; all messaging and existing suites pass.
- [x] 7.3 Run `pnpm test:e2e` for the messaging and accessibility journeys; all pass.
- [x] 7.4 Run `pnpm build`; the editor ships in the messaging client chunk and `sanitize-html`/`html-to-text` remain absent from client bundles.
- [x] 7.5 Complete a security review of the sanitizer allowlist, merge-value escaping, editor load boundary, and transport boundary before merge; verify the review covers every removal scenario in the delta spec.

## Workflow follow-up

- Archive the change after review and merge are complete.
- Verify the archived spec contains the HTML requirements and no planning-only content.
