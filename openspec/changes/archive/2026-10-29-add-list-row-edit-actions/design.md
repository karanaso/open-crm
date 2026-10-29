# Design

## Context

See `proposal.md` for motivation. Current state:

- The affected list pages are Server Components that render a `Table` inline: `src/app/(app)/companies/page.tsx`, `contacts/page.tsx`, `listings/page.tsx`, `deals/page.tsx` (list view), `tickets/page.tsx`, `campaigns/page.tsx`, and `segments/page.tsx`.
- Each record already has a dedicated edit route: `/companies/[id]/edit`, `/contacts/[id]/edit`, `/listings/[id]/edit`, `/deals/[id]/edit`, `/tickets/[id]/edit`, `/campaigns/[id]/edit`, and `/segments/[id]/edit`. Their forms cancel back to the record detail page.
- Detail pages already show an Edit button with a `Pencil` icon and `common.edit`.
- `Button` supports `asChild`, `variant="ghost"`, and `size="icon"`. `Table` already wraps tables in a horizontally scrollable container.
- `messages/en.json` has `common.edit` and `common.actions`; there is no per-record edit label.

## Goals / Non-Goals

**Goals:**

- One consistent edit affordance at the right edge of every affected list row.
- The action opens the existing edit page directly, without an intermediate detail visit.
- Keyboard and screen-reader users can identify which record each action edits.
- No changes to list queries, filters, pagination, services, actions, or authorization.

**Non-Goals:**

- New edit routes or inline row editing.
- Row delete, archive, or other action menus.
- Message lists, message groups, the deals board, nested related-record tables, task rows, or settings tables.
- Returning to the filtered list after edit; the existing edit forms keep their current cancel targets.

## Decisions

### 1. Shared `RowEditLink` component

Add `src/components/ui/row-edit-link.tsx` as a server-compatible component:

```tsx
export function RowEditLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="icon">
      <Link href={href} aria-label={label} title={label}>
        <Pencil className="size-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
```

The pages pass the existing edit URL and a localized accessible label. This keeps icon size, focus ring, hover treatment, and markup identical across seven call sites.

Alternatives considered:

- Inline markup per page: duplicates the accessibility details and invites drift.
- A dropdown row-actions menu: adds an extra interaction for the only action.
- A bare icon link without `Button`: would lose the shared focus and hover treatment.

### 2. Rightmost narrow column with a visually hidden header

Each table appends:

- `<TableHead className="w-12 text-right"><span className="sr-only">{tCommon("actions")}</span></TableHead>`
- `<TableCell className="text-right"><RowEditLink href={...} label={...} /></TableCell>`

The column is last and right-aligned to match the request. The icon-only header keeps the table compact while still giving assistive technology a column name. `Table` already scrolls horizontally on narrow screens, so the extra column does not break the layout.

### 3. Localized accessible name per record

Add `common.editFor` (`"Edit {name}"` in English, `"Επεξεργασία {name}"` in Greek) and compute the label per row:

| Grid | Display name |
| --- | --- |
| Companies | `company.name` |
| Contacts | `contact.firstName` + `contact.lastName` |
| Listings | `listing.title` |
| Deals (list) | `deal.name` |
| Tickets | `ticket.subject` |
| Campaigns | `campaign.name` |
| Segments | `segment.name` |

A screen reader therefore hears “Edit Acme Software” instead of seven identical “Edit” links. The pencil icon is `aria-hidden` so the link is announced once. Greek copy must be reviewed by the translator.

Alternatives considered:

- Generic `common.edit`: shorter but ambiguous when several rows are listed.
- Concatenating the existing `common.edit` with the name: avoids one catalog key but is harder to localize as a phrase and conflicts with the existing `roleFor`/`statusFor` naming pattern.
- Visible “Edit” text: widens every row and competes with the primary title link.

### 4. Reuse existing edit routes and list data

The list queries already return each record's ID and display name, so no service or query change is needed. The edit links point at the routes above; authorization stays unchanged because the existing edit pages and Server Actions remain the enforcement point. Archived or inactive records remain editable under current rules, so the action is not conditionally hidden.

### 5. Leave non-grid and already-actionable surfaces unchanged

- Messages and message groups edit inline on their detail pages and have no separate edit route.
- The deals board is a Kanban board, not a grid; cards keep their existing move and detail interactions.
- Nested related-record tables on detail pages link to records owned by other modules; adding edit links there would duplicate those modules' list actions.
- Task rows and settings tables already expose edit or action controls.

## Risks / Trade-offs

- **E2E selector collisions** → Playwright string name matching is substring-based, so an “Edit E2E Deal” link makes existing `getByRole("link", { name: DEAL })` locators resolve to two elements on list pages. Mitigation: tighten the affected list-page locators with `exact: true` or scope them to the title cell; the E2E tasks call out the affected specs.
- **Narrow screens** → The extra column consumes about 48px; the table already scrolls horizontally and the column stays at the right edge.
- **Greek copy** → The accessible name needs translator review; no external translation service is used.
- **Redundant navigation paths** → The title still opens detail and the pencil opens edit. This is intentional: members can choose the detail or edit path.
- **Read-only-looking records** → Archived campaigns are read-only, but the edit page already handles that state; the action remains visible and does not promise a successful save.

## Migration Plan

No schema, data, authentication, or URL migration. Deploy as a normal application release. Rollback is reverting the shared component, the seven table changes, and the catalog key.
