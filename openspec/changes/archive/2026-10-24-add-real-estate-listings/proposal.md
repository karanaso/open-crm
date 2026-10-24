# Proposal

## Why

OpenCRM stores companies, contacts, deals, tickets, campaigns, and tasks, but it has no property inventory. A real estate agency needs listings for sale and rent, seller and buyer relationships around a property, scheduled viewings, listing photos, and commission-based deal reporting. Buyers are often individuals without a company, and property prices are not USD-only, so the current company-centric and USD-only sales model cannot represent the workflow.

## What Changes

- Add a **listing** record for sale and rent properties: reference, transaction, price with currency and rent period, one-time commission, address, core property facts, grouped features, seller contact, responsible agent, active/inactive status, and listed/closed timestamps.
- Add grouped listing features from the existing taxonomy: a typed core for ranges and sorting, plus a JSONB feature object that preserves the supplied groups (location, construction, exterior, style, roof, yard, home type, rooms, flooring, kitchen, dining, master suite, bath, energy, accessibility). All fields are retained; the UI groups them and exposes the long tail progressively.
- Add listing photos with upload, public serving, ordering, deletion, and orphan cleanup. Uploads are allowed for listing photos only; no other attachments.
- Add scheduled and historical viewings per listing and contact, with a listing-scoped calendar/grid. No tenancy, rent collection, or maintenance management.
- Extend the deal model: a deal always has a buyer/tenant contact, the company becomes optional, and a deal may link to a listing with snapshots of the negotiated property price and the one-time commission. Add per-record currency.
- Add listing search, filtering, detail, nav entry, global search results, and a listings module overview. The main dashboard gets a compact listings summary.
- Add an unauthenticated, read-only public JSON API for active listings. It exposes public listing fields and photos only, never seller, agent, commission, or internal state. Public listing pages remain out of scope.
- Extend the activity and task link model to include listings, so a listing can own a timeline and follow-up tasks.
- Update the directory so contact and company detail pages surface selling and buying relationships.
- Internationalize money and time display: per-listing and per-deal currency, a workspace default currency, and a workspace display time zone. No FX conversion or cross-currency totals.
- **BREAKING**: deals require a contact and no longer require a company; deal `amount` becomes a one-time commission; money is no longer fixed to USD; a public unauthenticated read API is introduced; uploads are permitted for listing photos only.
- Update AGENTS.md and the affected specs to reflect the currency, public API, and upload policy changes.

**Out of scope:** tenancy and rental management, public listing pages, FX conversion, co-owner seller tables, listing documents/contracts, MLS import, per-agent record permissions, and multi-tenancy.

## Capabilities

### New Capabilities

- `real-estate-listings`: listing records, sale/rent pricing and commission, grouped property features, seller and agent relationships, listing photos, viewings, listing search/filter/detail, and the listings module overview.
- `public-listings-api`: the unauthenticated read-only JSON API for active listings, including projection rules, filtering, pagination, caching, CORS, and rate limiting.

### Modified Capabilities

- `sales-pipeline`: deal contact becomes required, company becomes optional, listing linkage and price/commission snapshots are added, currency is per deal, and commission metrics are grouped by currency.
- `crm-directory`: company and contact detail pages show listing seller and buyer relationships; contact and company records can participate in multiple listings without a role field.
- `engagement-timeline`: activities and tasks gain a listing link, listing detail pages receive the combined timeline, and listing is added to task record-type filters.
- `crm-dashboard`: navigation, global search, and dashboard metrics include listings; commission metrics respect currency; the listings module overview is introduced.
- `ui-localization`: currency and display time zone become configurable, listing and feature labels are added to both catalogs, and the Greek glossary gains listing, commission, seller/landlord, viewings, and feature terminology.
- `workspace-access`: the unauthenticated public listings read API is an explicit exception to session enforcement and is limited to public listing data.

## Impact

- **Database:** new `listings`, `listing_photos`, `listing_viewings`, and workspace settings tables; `activities.listing_id` and `tasks.listing_id`; deal changes (`contact_id` NOT NULL, `company_id` nullable, `listing_id`, `property_price`, `currency`); updated activity/task link checks; indexes and GIN index for listing features. Migrations required.
- **Services and actions:** new listing services, validation, Server Actions, photo upload/reorder/delete, viewing scheduling, listing dashboard aggregates, public API handler; changes to deals, search, dashboard, timeline, tasks, and directory services.
- **UI:** listings nav, list, filters, detail, create/edit, feature groups, photo manager, viewings calendar/grid, module overview; deal form/detail changes; contact/company detail additions; dashboard tiles; global search group; bilingual messages and glossary.
- **API:** `GET /api/public/v1/listings` and `GET /api/public/v1/listings/{id}` with no session, explicit public projection, currency-aware price filters, pagination, cache headers, CORS, and rate limiting.
- **Storage and deployment:** public listing-image storage on a persistent volume, `sharp` for re-encoding, Docker/standalone documentation, backup and orphan-cleanup guidance.
- **Security:** unauthenticated read surface, PII exclusion tests, upload validation and EXIF stripping, public image URL privacy trade-off, security review required.
- **Dependencies:** add `sharp`; reuse dnd-kit, Recharts, and existing UI primitives.
