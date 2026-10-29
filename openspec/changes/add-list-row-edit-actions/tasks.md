# Tasks

## 1. Shared row edit action

- [x] 1.1 Add `common.editFor` (`"Edit {name}"`) to `messages/en.json` and its Greek equivalent to `messages/el.json`, review the Greek wording with the translator, and verify with `pnpm i18n:check`.
- [x] 1.2 Create `src/components/ui/row-edit-link.tsx` exporting `RowEditLink({ href, label })`: a ghost icon button wrapping a Next.js `Link`, with `aria-label` and `title` set to the label and the `Pencil` icon marked `aria-hidden`. Verify with `pnpm typecheck` and `pnpm lint`.
- [x] 1.3 Add `tests/unit/row-edit-link.test.tsx` covering the href, the accessible name, and the hidden icon, and verify with `pnpm test tests/unit/row-edit-link.test.tsx`.

## 2. Directory grids

- [x] 2.1 Add the rightmost actions column to `src/app/(app)/companies/page.tsx` and `contacts/page.tsx`, using `RowEditLink` with `/companies/${id}/edit` and `/contacts/${id}/edit` and `common.editFor` labels from the record names. Verify with `pnpm typecheck` and `pnpm lint`.
- [x] 2.2 Extend `tests/e2e/02-directory.spec.ts` to assert the company and contact row edit links point to their edit pages, tighten affected title-link locators with `exact: true`, and verify with `pnpm test:e2e -- tests/e2e/02-directory.spec.ts`.

## 3. Listings grid

- [x] 3.1 Add the actions column to `src/app/(app)/listings/page.tsx` with `/listings/${id}/edit` and a `listing.title` label. Verify with `pnpm typecheck` and `pnpm lint`.
- [x] 3.2 Extend `tests/e2e/12-listings.spec.ts` to assert the listing row edit link opens the edit page and tighten affected title-link locators with `exact: true`; verify with `pnpm test:e2e -- tests/e2e/12-listings.spec.ts`.

## 4. Deals list grid

- [x] 4.1 Add the actions column to the list view in `src/app/(app)/deals/page.tsx` with `/deals/${id}/edit` and a `deal.name` label, leaving the Kanban board untouched. Verify with `pnpm typecheck` and `pnpm lint`.
- [x] 4.2 Extend `tests/e2e/03-deals.spec.ts` to assert the deal list row edit link opens the edit page, assert the board has no row edit link, and tighten affected title-link locators with `exact: true`; verify with `pnpm test:e2e -- tests/e2e/03-deals.spec.ts`.

## 5. Tickets grid

- [x] 5.1 Add the actions column to `src/app/(app)/tickets/page.tsx` with `/tickets/${id}/edit` and a `ticket.subject` label. Verify with `pnpm typecheck` and `pnpm lint`.
- [x] 5.2 Extend `tests/e2e/04-tickets.spec.ts` to assert the ticket row edit link opens the edit page and tighten affected title-link locators with `exact: true`; verify with `pnpm test:e2e -- tests/e2e/04-tickets.spec.ts`.

## 6. Marketing grids

- [x] 6.1 Add the actions column to `src/app/(app)/campaigns/page.tsx` and `segments/page.tsx` with `/campaigns/${id}/edit` and `/segments/${id}/edit` and `campaign.name` and `segment.name` labels. Verify with `pnpm typecheck` and `pnpm lint`.
- [x] 6.2 Extend `tests/e2e/05-marketing.spec.ts` to assert the campaign and segment row edit links open their edit pages and tighten affected title-link locators with `exact: true`; verify with `pnpm test:e2e -- tests/e2e/05-marketing.spec.ts`.

## 7. Integration verification

- [x] 7.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm i18n:check`; resolve any failures.
- [x] 7.2 Run `pnpm test:e2e -- tests/e2e/02-directory.spec.ts tests/e2e/03-deals.spec.ts tests/e2e/04-tickets.spec.ts tests/e2e/05-marketing.spec.ts tests/e2e/12-listings.spec.ts tests/e2e/08-a11y.spec.ts`; resolve any failures.
- [x] 7.3 Run `pnpm build` and confirm the production build passes.

## Workflow follow-up

- Review the final diff against the spec coverage boundary, including that messages, the deals board, nested related tables, task rows, and settings tables are unchanged.
- Archive the change after implementation and verification are complete.
