---
name: crm-directory
description: Module context for the OpenCRM customer directory. Use when a task touches companies, contacts, tags, CSV import, related records, or directory search and filtering.
---

# CRM Directory

Load this skill with `backend`, `frontend`, or `qa` when the task touches companies, contacts, tags, or CSV import.

## Module map

- Spec: `openspec/specs/crm-directory/spec.md`
- Routes:
  - `src/app/(app)/companies/**`
  - `src/app/(app)/contacts/**`
  - `src/app/(app)/import/page.tsx`
- Components: `src/components/directory/**`
- Server Actions: `src/actions/companies.ts`, `src/actions/contacts.ts`, `src/actions/import.ts`
- Services: `src/lib/services/companies.ts`, `src/lib/services/contacts.ts`, `src/lib/services/csv-import.ts`, `src/lib/services/tags.ts`
- Validation: `src/lib/validation/company.ts`, `src/lib/validation/contact.ts`, `src/lib/validation/common.ts`
- Schema: `companies`, `contacts`, `tags`, `company_tags`, `contact_tags`
- Tests: `tests/integration/directory.test.ts`, `tests/integration/csv-import.test.ts`, `tests/e2e/02-directory.spec.ts`, `tests/unit/normalize.test.ts`

## Invariants

1. Company domains are normalized to lowercase without protocol or `www.` and must be unique; duplicate domains are skipped and counted during import.
2. Contact emails are unique case-insensitively. A contact may exist without a company. CSV import may associate a contact by company domain or company name.
3. Archived companies and contacts disappear from pickers but remain visible on related records. Restore returns them to normal use.
4. Tags are trimmed, deduplicated case-insensitively, limited to 40 characters each, and at most 20 per record. Tag filters use OR within tags.
5. An inactive owner cannot receive new records. A deactivated owner remains visible on existing records and records can be reassigned.
6. CSV import limits are 5 MB and 5,000 data rows. Invalid rows are reported with row numbers; valid rows still import. Duplicate rows are skipped.
7. Search and filters combine, survive pagination, and preserve the selected owner, tag, industry, and query.
8. Related-record sections show deals, tickets, activities, tasks, and campaign memberships without reimplementing module logic.

## Workflow

1. Read the directory spec and the affected service first.
2. Keep domain rules in `src/lib/services/**`; pages and forms call actions/services.
3. Update integration coverage for service rules and E2E coverage for the directory journey.
4. Check empty, partial-import, duplicate, archived, and permission states.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration tests/integration/directory.test.ts tests/integration/csv-import.test.ts`
- `pnpm test:e2e tests/e2e/02-directory.spec.ts`
