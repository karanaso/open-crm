# OpenCRM — project guide for agents

## What this repository is

OpenCRM is a self-hosted CRM for a small team. It covers customer records, sales, support, marketing, tasks, and a shared activity timeline in one workspace.

Stack:

- Next.js 15 App Router, React 19, strict TypeScript
- PostgreSQL + Drizzle ORM + postgres.js
- Auth.js v5 credentials sessions + Argon2id
- Tailwind CSS v4 + shadcn/ui + Radix primitives
- dnd-kit, Recharts, Papa Parse
- Vitest, Testing Library, Playwright

## Repository map

```text
src/app/                 routes, layouts, pages, API handlers
src/actions/             Server Actions (mutations)
src/components/          shared UI and module components
src/components/ui/       shared UI primitives
src/db/                  Drizzle schema, client, seed, default pipeline
src/lib/auth/            password, tokens, guards, throttling
src/lib/services/        domain queries and mutations
src/lib/validation/      Zod schemas
tests/unit/              pure logic and component tests
tests/integration/       real PostgreSQL service tests
tests/e2e/               Playwright journeys
openspec/                proposals, specs, designs, tasks
```

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Integration tests use `opencode_crm_test`. E2E tests prepare and use `opencode_crm_e2e` on port 3100. Never point test commands at production data.

## Architecture rules

- Server Components perform reads. Server Actions perform mutations. API route handlers are limited to auth, health, and read-only search.
- Domain services in `src/lib/services/` must not import UI code. They should be callable from tests and other services.
- Zod schemas in `src/lib/validation/` are the shared input contract. Every Server Action re-validates on the server.
- Shared UI belongs in `src/components/ui/`. Module-specific UI belongs under the module folder.
- Database enum values are stable identifiers. Translate display labels, not stored values.
- One workspace per deployment. All active members share records. Do not introduce `workspace_id` casually.
- Amounts are USD. SLA calculations use calendar hours in UTC. Do not silently change these constraints.
- No email/calendar delivery, file attachments, public API, or multi-tenancy in this version.

## Modules

- Directory: companies, contacts, tags, CSV import
- Sales: pipelines, stages, deals, Kanban, stage-change activity
- Support: tickets, status machine, SLA, comments
- Marketing: segments, campaigns, audience snapshots, engagement
- Dashboard: aggregates, charts, recent activity, global search
- Access/settings: setup, invites, roles, profile, pipeline configuration

Shared cross-cutting code: activity timeline, tasks, validation, auth guards, UI primitives.

## OpenSpec workflow

- Use `/opsx-propose` to turn an idea into planning artifacts.
- Use `/opsx-apply` to implement a change.
- Use `/opsx-archive` to archive a completed change.
- Read the active change's proposal, specs, design, and tasks before modifying behavior.
- Keep planning artifacts and implementation commits separate when practical.

## Agent workflow

### Current roster

| Agent | Mode | Owns |
| --- | --- | --- |
| `lead` | primary | Planning, delegation, review, integration, branch/commit/merge decisions |
| `backend` | subagent | Schema, migrations, services, Server Actions, auth, validation, API routes |
| `frontend` | subagent | Pages, layouts, forms, client components, accessibility, responsive behavior |
| `qa` | subagent | Unit/integration/E2E tests, regression checks, accessibility verification |
| `librarian` | subagent | Dependencies, config, shared UI primitives, shared helpers, documentation |
| `translator` | all | Greek message catalogs, glossary, terminology, pluralization, localization review |

### Module skills

Load the relevant module skill alongside the role agent; do not create per-module agents.

| Skill | Covers |
| --- | --- |
| `crm-access` | setup, authentication, invitations, roles, profile, team administration |
| `crm-directory` | companies, contacts, tags, CSV import, directory search |
| `crm-sales` | pipelines, stages, deals, Kanban, pipeline metrics |
| `crm-support` | tickets, comments, status machine, SLA |
| `crm-marketing` | segments, campaigns, audience snapshots, engagement |
| `crm-dashboard` | dashboard aggregates, charts, recent activity, global search, navigation shell |
| `engagement-timeline` | activities, tasks, shared record timeline |

- Delegation names both the role agent and the module skill, for example "backend + `crm-sales`".
- Module skills carry file maps and invariants; role agents keep path permissions and shared rules.
- Workers return a summary, files changed, tests run, failures, and open questions.
- Only the lead commits. Workers must not commit or push.
- Use short-lived branches from `main`: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`.
- Make small Conventional Commits. One logical change per commit.
- Use separate worktrees when parallel agents would edit the same working tree.
- Merge back to `main` only after verification.
- The lead resolves cross-cutting changes that span role boundaries.

## Security and repository hygiene

- Never commit `.env.local`, API keys, passwords, tokens, or `karanaso.txt`.
- Never log secrets or paste production data into test fixtures.
- Do not edit the global OpenCode configuration.
- Do not send customer data or private UI strings to external services.
- Do not run destructive database commands against development or production data.
- Keep the working tree clean after a task.

## Definition of done

- The requested behavior is implemented and scoped.
- Relevant tests were added or updated.
- `pnpm lint`, `pnpm typecheck`, and the relevant test suites pass.
- A production build passes for release-level changes.
- Documentation is updated when behavior or setup changes.
- No secrets, generated build output, or unrelated files are staged.
- The branch and commits tell a clear, reviewable story.
