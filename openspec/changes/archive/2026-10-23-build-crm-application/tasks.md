# Tasks

## 1. Project foundation

- [x] 1.1 Scaffold a Next.js App Router application with strict TypeScript, Tailwind CSS v4, ESLint, Prettier, and pnpm scripts; verify `pnpm build` succeeds on a placeholder page.
- [x] 1.2 Initialize shadcn/ui and add base components (button, input, select, dialog, sheet, table, tabs, badge, card, dropdown, command, toast); verify a sample page renders them and `pnpm build` passes.
- [x] 1.3 Add a Docker Compose PostgreSQL 16 service, `.env.example`, and Zod environment validation for `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, and `NODE_ENV`; verify `docker compose up -d db` and the environment validation test pass.
- [x] 1.4 Configure Drizzle ORM with `postgres.js`, drizzle-kit, migration scripts, and a database client; verify `drizzle-kit check` and a connectivity smoke test pass.
- [x] 1.5 Configure Next.js for Server Actions with an 8 MB body limit, standalone output, and typed routes; verify `pnpm build` produces standalone output.
- [x] 1.6 Set up Vitest, Testing Library, and Playwright with test scripts and one sample test per layer; verify `pnpm test`, `pnpm test:integration`, and `pnpm test:e2e` run the samples.
- [x] 1.7 Add root layouts, `(auth)` and `(app)` route groups, global styles, an error boundary, not-found page, and loading states; verify each route renders without runtime errors.
- [x] 1.8 Add `/api/health` with a database check and a multi-stage Dockerfile; verify the endpoint returns 200 with Postgres running and the container image builds.
- [x] 1.9 Write README setup instructions for prerequisites, install, database start, migrations, development, and test commands; verify a fresh checkout can follow them to run the app.

## 2. Database schema and migrations

- [x] 2.1 Create enums and access tables (`users`, `invites`, `password_reset_tokens`, `login_attempts`) with unique lower(email), token digest, role/status, and session version; verify the migration applies and unique/check constraints fail correctly in integration tests.
- [x] 2.2 Create directory tables (`companies`, `contacts`, `tags`, `company_tags`, `contact_tags`) with owner foreign keys, archive timestamps, and case-insensitive contact email uniqueness; verify the migration and constraint tests pass.
- [x] 2.3 Create sales tables (`pipelines`, `stages`, `deals`) with enums, an amount check, and indexes; seed the default Sales Pipeline and six stages in the initial migration; verify the seeded rows exist after `pnpm db:migrate`.
- [x] 2.4 Create engagement tables (`activities`, `tasks`) with five nullable record links, `num_nonnulls(...) >= 1` checks, stage-change metadata, and task completion fields; verify link and completion constraints with integration tests.
- [x] 2.5 Create support tables (`tickets`, `ticket_comments`) with status, priority, and visibility enums plus indexes for assignment, status, and creation time; verify the migration and constraint tests pass.
- [x] 2.6 Create marketing tables (`segments`, `campaigns`, `campaign_recipients`) with criteria and snapshot JSON, unique campaign/contact pairs, and status indexes; verify the migration and uniqueness tests pass.
- [x] 2.7 Add `pg_trgm` and GIN indexes for directory and global-search columns; verify the extension and indexes exist and a sample `ILIKE` query returns expected rows.
- [x] 2.8 Build the database integration test harness against `crm_test` with migrate, cleanup, and factories, plus schema constraint tests; verify `pnpm test:integration` passes against Docker Postgres.
- [x] 2.9 Add a development seed script for users, companies, contacts, deals, tickets, and campaigns; verify it runs twice without duplicating data and refuses to run when `NODE_ENV=production`.

## 3. Authentication and workspace access (`workspace-access`)

- [x] 3.1 Implement Argon2id password hashing, email/domain/tag normalization, and single-use token generation and digest helpers; verify unit tests cover hashing, normalization, and token primitives.
- [x] 3.2 Implement the first-run setup page and Server Action with an advisory lock, no-user guard, admin creation, and default-pipeline check; verify integration tests for first admin, duplicate setup, and concurrent setup attempts.
- [x] 3.3 Configure the Auth.js Credentials provider with JWT sessions, seven-day sliding expiry, secure cookies, and a custom sign-in page; verify valid, invalid, and inactive-user sign-in integration tests pass.
- [x] 3.4 Implement sign-out, return-path handling, and expired-session redirects; verify Playwright covers sign-in, protected redirect, and sign-out.
- [x] 3.5 Implement database-backed sign-in throttling with five failures in 15 minutes, a 15-minute lock, and reset on success; verify integration tests with an injectable clock cover lock and unlock.
- [x] 3.6 Implement `requireUser()` and `requireAdmin()` with active-status and session-version checks, protect the `(app)` layout, and return 401/403 from actions; verify unauthorized and forbidden action tests pass.
- [x] 3.7 Implement invite creation, one-time link display, the acceptance page, and single-use redemption with seven-day expiry; verify integration and Playwright tests for accept, reuse, expiry, and existing-account rejection.
- [x] 3.8 Implement team administration for member list, role changes, deactivate/reactivate, pending-invite revocation, and last-admin protection; verify integration tests for each rule and immediate access loss after deactivation.
- [x] 3.9 Implement password change and administrator-issued reset links with 24-hour expiry, one-time use, and session-version invalidation; verify integration tests for success, wrong current password, reuse, expiry, and other-session sign-out.
- [x] 3.10 Build the profile and team settings pages with role-based navigation placeholders; verify Playwright confirms members cannot reach admin settings and admins can manage the team.
- [x] 3.11 Document first-run setup, invitations, deactivation, password reset, and auth environment variables in README; verify the documented steps match the running app.
- [x] 3.12 Add an end-to-end auth journey covering setup, invite, acceptance, sign-in, deactivation, and blocked access; verify `pnpm test:e2e -- auth` passes.

## 4. Application shell and shared UI

- [x] 4.1 Build the persistent navigation shell with sidebar, top bar, active-section state, user menu, and mobile sheet; verify responsive Playwright checks at desktop and mobile widths.
- [x] 4.2 Build reusable page header, data table, filter bar, pagination, empty state, confirm dialog, form field, and toast wrappers; verify component tests for rendering, keyboard focus, and empty/loading states.
- [x] 4.3 Implement shared URL search-param parsing for filters, sorting, and pagination; verify unit tests cover defaults, invalid values, and round-trip serialization.
- [x] 4.4 Implement local-time date rendering and date-only UTC helpers; verify unit tests for formatting, due-date comparisons, and timezone rendering.
- [x] 4.5 Add route-level error boundaries, skeleton loading states, and not-found views for app sections; verify each route shows the intended state without crashing.
- [x] 4.6 Add a component test for shell navigation and document the navigation structure in README; verify `pnpm test` passes and the documented routes match `src/app`.

## 5. Directory: companies and contacts (`crm-directory`)

- [x] 5.1 Implement Zod schemas and normalization for companies, contacts, tags, owners, and directory filters; verify unit tests for required fields, domain/email normalization, tag limits, and invalid owner input.
- [x] 5.2 Implement company query and mutation services for create, edit, archive, restore, owner assignment, tags, and related-record counts; verify integration tests for each rule and active-owner enforcement.
- [x] 5.3 Build the company list page with text search, owner/tag/industry filters, pagination, and URL state; verify Playwright covers search, combined filters, empty state, and pagination.
- [x] 5.4 Build the company detail page with contacts, deals, tickets, and combined timeline/task sections; verify Playwright navigates each related record and shows archived indicators.
- [x] 5.5 Implement contact query and mutation services for create, edit, archive, restore, owner assignment, tags, company link, and case-insensitive email uniqueness; verify integration tests including duplicate email rejection.
- [x] 5.6 Build the contact list page with text search, owner/tag/company filters, pagination, and URL state; verify Playwright covers filters and pagination.
- [x] 5.7 Build the contact detail page with company, deals, tickets, campaign memberships, and combined timeline/task sections; verify Playwright navigates each related record.
- [x] 5.8 Implement tag creation, normalization, deduplication, limits, and tag filters for both directories; verify unit and integration tests for tag rules and OR filtering.
- [x] 5.9 Implement CSV parsing, row validation, company resolution, deduplication, batch insertion, and import summaries in a Server Action with 5 MB/5,000-row limits; verify integration tests for full, partial, duplicate, oversized, and unsupported imports.
- [x] 5.10 Build the CSV mapping and preview UI with target selection, column mapping, preview, confirmation, and result summary; verify Playwright imports a valid file and displays partial-error details.
- [x] 5.11 Document company/contact fields, tag rules, archive behavior, and CSV formats in README; verify the documented CSV samples import successfully.

## 6. Engagement timeline and tasks (`engagement-timeline`)

- [x] 6.1 Implement activity schemas and services for note/call/email/meeting creation, multi-record links, occurred-at validation, editing, and deletion with author/admin rules; verify integration tests for each rule.
- [x] 6.2 Implement task schemas and services for creation, due-date rules, assignment, completion/reopen, reassignment, linking, editing, and deletion; verify unit and integration tests for lifecycle and overdue computation.
- [x] 6.3 Build the activity composer and timeline component with type filters, pagination, author display, and linked-record links; verify component tests and Playwright on company, contact, and deal timelines.
- [x] 6.4 Build the task page with My tasks and All tasks views, overdue/today/upcoming/later grouping, a completed section, and filters; verify Playwright covers grouping and filtering.
- [x] 6.5 Integrate timeline and task sections into company, contact, deal, ticket, and campaign detail layouts with create/edit/complete/delete interactions; verify Playwright on each detail page.
- [x] 6.6 Add unit tests for stage-change activity rendering and timeline ordering; verify newest-first ordering and system entries appear without user actions.
- [x] 6.7 Document activity types, task grouping, and overdue rules in README; verify the documented behavior matches the task page.

## 7. Sales pipeline (`sales-pipeline`)

- [x] 7.1 Implement pipeline and stage services for create, rename, reorder, archive guards, default selection, and one-default enforcement; verify integration tests for each guard and the reorder transaction.
- [x] 7.2 Build admin pipeline settings UI for pipelines, stages, probabilities, outcomes, and default selection; verify Playwright covers create, reorder, default change, and occupied-stage rejection.
- [x] 7.3 Implement deal schemas and services for create/edit, cross-field stage/pipeline and contact/company validation, owner rules, USD amounts, status derivation, closed timestamps, lost reasons, and optimistic concurrency; verify integration tests for each rule and a stale update conflict.
- [x] 7.4 Implement the stage-move transaction that updates the deal, records the stage-change activity, and honors win/loss/reopen rules; verify integration tests for move, win, loss, reopen, and stale update conflict.
- [x] 7.5 Build the Kanban board with stage columns, cards, metrics, drag-and-drop, and a keyboard-accessible move menu; verify component tests and Playwright for pointer and keyboard moves.
- [x] 7.6 Build the deal list with pipeline/stage/status/owner/date filters, search, sorting, pagination, and URL state; verify Playwright covers combined filters and sorting.
- [x] 7.7 Build deal create/edit forms with dependent company/contact, pipeline/stage, and owner controls; verify Playwright covers validation errors and successful creation.
- [x] 7.8 Build the deal detail page with stage change, win/loss, timeline, tasks, and related links; verify Playwright covers the full deal lifecycle.
- [x] 7.9 Document pipeline configuration, default pipeline behavior, and win/loss rules in README; verify the documented steps work in the admin UI.

## 8. Support desk (`support-desk`)

- [x] 8.1 Implement the ticket status state machine and SLA policy module with priority targets, due-time calculation, first response, resolution, overdue, and reopen behavior; verify unit tests for every transition and SLA case.
- [x] 8.2 Implement ticket schemas and services for creation, requester/company derivation, priority changes, assignment, and allowed status transitions; verify integration tests including invalid transitions and priority recalculation.
- [x] 8.3 Implement comment services for reply/internal visibility, author and timestamp, empty-body rejection, the first-response transaction, and resolved/reopened timestamp handling; verify integration tests for visibility and SLA updates.
- [x] 8.4 Build the ticket list with status/priority/assignee/overdue/requester filters, search, sorting, pagination, and a default active view; verify Playwright covers filters, search, and unassigned/overdue views.
- [x] 8.5 Build ticket create and edit forms with requester search, priority, assignee, and derived company display; verify Playwright covers creation, validation, and reassignment.
- [x] 8.6 Build the ticket detail page with SLA state, status actions, comments, visibility badges, and linked activities/tasks; verify Playwright covers reply, internal-note visibility, resolve, and reopen.
- [x] 8.7 Add related-ticket sections to contact and company detail pages; verify Playwright shows tickets with status and links.
- [x] 8.8 Document ticket statuses, transitions, SLA targets, and internal-note visibility in README; verify the documented policy matches the UI.

## 9. Marketing campaigns (`marketing-campaigns`)

- [x] 9.1 Implement the segment criteria schema and query evaluator with AND across fields, OR within tags, archived-contact exclusion, and live count; verify unit and integration tests for each criterion and combination.
- [x] 9.2 Implement segment create/edit/archive services and count queries; verify integration tests including empty-criteria rejection and archived-segment behavior.
- [x] 9.3 Build segment list, form, and detail views with a live matching count and criterion editing; verify Playwright covers creation, count updates, and archive.
- [x] 9.4 Implement campaign schemas and services for create/edit, channel/status enums, USD budget, date validation, owner, lifecycle transitions, and activation guards; verify integration tests for each transition and empty-audience rejection.
- [x] 9.5 Implement the activation transaction that snapshots segment name/criteria and creates targeted recipients, plus recipient status updates and campaign metrics; verify integration tests for snapshot immutability, status counts, response rate, and conversion rate.
- [x] 9.6 Build campaign list, create/edit form, detail page, audience/engagement table, and metrics display; verify Playwright covers activation, snapshot behavior, status updates, and archived read-only state.
- [x] 9.7 Document segment criteria, campaign lifecycle, snapshot semantics, and manual engagement tracking in README; verify the documented flow matches the campaign UI.

## 10. Dashboard and global search (`crm-dashboard`)

- [x] 10.1 Implement sales dashboard aggregate queries for open count/value, weighted value, current-month wins/value, win rate, and 30-day closing deals; verify integration tests with mixed open/won/lost data.
- [x] 10.2 Implement support dashboard aggregates for active tickets, unassigned, overdue, and 30-day average first-response and resolution times; verify integration tests including empty periods.
- [x] 10.3 Implement marketing and personal-task aggregates for active campaigns, audience, response/conversion rates, and overdue/today/upcoming task counts; verify integration tests for active-only and per-user scoping.
- [x] 10.4 Build the dashboard with metric cards, pipeline/ticket/campaign charts, recent activity, empty states, and create-action links; verify Playwright against seeded data and an empty workspace.
- [x] 10.5 Implement the read-only global search route with grouping, a two-character minimum, a five-per-type cap, and session enforcement; verify integration tests for matching, cap, short query, and unauthorized access.
- [x] 10.6 Build the command-palette search UI with debounce, grouped results, keyboard navigation, and record links; verify Playwright covers mixed results, no results, and navigation.
- [x] 10.7 Document dashboard metric definitions and global search scope in README; verify the documented definitions match the queries.

## 11. Integration hardening and release readiness

- [x] 11.1 Run the complete Playwright critical-path suite across setup, directory, timeline/tasks, sales, support, marketing, dashboard, and search; verify all tests pass against seeded data.
- [x] 11.2 Audit keyboard navigation, focus order, labels, and contrast on the shell, forms, Kanban, and ticket comments; verify fixes with Playwright keyboard flows and targeted accessibility checks.
- [x] 11.3 Audit every Server Action and Route Handler for session, role, input validation, record relationship, CSRF/origin, and object-level authorization; verify unauthorized-access integration tests cover each mutation.
- [x] 11.4 Seed a realistic dataset and measure directory lists, global search, the pipeline board, ticket lists, and dashboard queries; verify slow queries are indexed and page responses remain acceptable.
- [x] 11.5 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`, and `drizzle-kit check`; verify all commands pass from a clean checkout.
- [x] 11.6 Verify README covers environment variables, migrations, production build, Docker deployment, first-run setup, invite/reset operations, CSV formats, SLA policy, and known limitations; verify a fresh deployment succeeds by following it.
- [x] 11.7 Review the diff for accidental secrets, debug logging, unused dependencies, and unhandled empty/error states; verify the final build and test suite remain green.

## Workflow follow-up

- Archive the change after implementation is reviewed and all tasks are complete.
- Verify the archived specs and change state with `openspec show` and `openspec validate --strict`.
