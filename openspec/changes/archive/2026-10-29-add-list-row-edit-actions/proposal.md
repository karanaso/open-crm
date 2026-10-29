# Proposal

## Why

Members must open a record's detail page before they can reach its edit form. On the list grids this adds a navigation step to a routine task, and the title is currently the only link to the record. A direct row-level edit action shortens the correction path without changing record behavior.

## What Changes

- Add a rightmost, right-aligned actions column to the record list grids for companies, contacts, listings, deals (list view), tickets, campaigns, and segments.
- Render one icon-only pencil link per row that opens that record's existing edit page.
- Give each icon link a localized accessible name that identifies the record (for example, "Edit Acme Software"), and keep the title link pointing to the detail page.
- Use a visually hidden "Actions" column header and preserve keyboard focus and hover states.
- Add a shared row edit link component so every grid renders the same affordance.
- Add the `common.editFor` message to the English and Greek catalogs.
- Add unit coverage for the shared link and end-to-end coverage for each affected list page.

Out of scope:

- Message and message-group lists, which have no separate edit page and edit inline on their detail pages.
- The deals Kanban board; only the deals list view is a grid.
- Nested related-record tables on detail pages; those rows belong to other modules and link to their own records.
- Task rows and settings tables, which already expose edit or action controls.

## Capabilities

### New Capabilities

- `record-list-actions`: the shared behavior and coverage of direct row actions on record list grids.

### Modified Capabilities

None. The existing module list requirements (directory lists, listing lists, deal lists, ticket lists, campaign and segment lists) keep their filtering, search, sorting, pagination, and URL contracts. Only a new cross-cutting row-action behavior is introduced.

## Impact

- Affected pages: `src/app/(app)/companies/page.tsx`, `contacts/page.tsx`, `listings/page.tsx`, `deals/page.tsx` (list view), `tickets/page.tsx`, `campaigns/page.tsx`, and `segments/page.tsx`.
- New shared UI: `src/components/ui/row-edit-link.tsx`.
- `messages/en.json` and `messages/el.json` gain `common.editFor`; Greek copy requires translator review.
- Tests: `tests/unit/` plus `tests/e2e/02-directory.spec.ts`, `03-deals.spec.ts`, `04-tickets.spec.ts`, `05-marketing.spec.ts`, and `12-listings.spec.ts`.
- No database schema, service, Server Action, API route, auth, or URL contract changes.
