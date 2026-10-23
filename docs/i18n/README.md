# UI Localization

OpenCRM supports English (`en`) and Greek (`el`). English is the default and the source catalog. The interface uses `next-intl` in no-routing mode: URLs do not contain a locale.

## Runtime resolution

1. A supported locale cookie (`opencrm_locale`).
2. The first supported language in `Accept-Language`.
3. English.

The profile preference on `users.locale` is the durable source for signed-in users. The cookie is the request-time projection:

- Sign-in reads the profile locale and sets the cookie.
- The profile language control updates `users.locale` and the cookie.
- Setup and invite acceptance store the cookie locale on the new account.
- Auth pages can change the cookie before a user exists.

A second active session keeps its previous locale until its next sign-in.

## File map

| Path | Purpose |
| --- | --- |
| `messages/en.json` | English source catalog |
| `messages/el.json` | Greek catalog; must mirror every English key |
| `src/i18n/config.ts` | Supported locales, default, `Locale`, `isLocale`, `resolveLocale` |
| `src/i18n/request.ts` | `getRequestConfig`: cookie, `Accept-Language`, messages |
| `src/i18n/cookie.ts` | Locale cookie read/write helpers |
| `src/i18n/format.ts` | Locale-aware dates, USD, numbers, durations |
| `src/i18n/labels.ts` | Enum value to catalog-key mapping |
| `src/i18n/catalog.ts` | Catalog parity and placeholder checks |
| `src/app/layout.tsx` | `NextIntlClientProvider`, `<html lang>`, metadata |
| `tests/unit/i18n-*.test.*` | Catalog, formatting, label, and document tests |

## Adding or changing a string

1. Add the key and English text to `messages/en.json`.
2. Add the same key to `messages/el.json`; preserve placeholders and ICU syntax.
3. Use `useTranslations("namespace")` in client components or `getTranslations("namespace")` in server components.
4. Run `pnpm i18n:check` to verify key and placeholder parity.
5. Run `pnpm typecheck`; message keys are typed from `messages/en.json`.

Namespaces: `common`, `nav`, `metadata`, `auth`, `settings`, `directory`, `sales`, `support`, `marketing`, `dashboard`, `timeline`, `validation`, `errors`, `enums`.

## What is not translated

- User data: company and contact names, notes, tags, pipeline stage names, campaign copy, activity subjects, and task titles.
- Stored enum identifiers such as `in_progress` or `admin`. Only their display labels are localized through `src/i18n/labels.ts`.
- The product name `OpenCRM`.
- CSV headers.
- USD currency or UTC timestamp storage.

## Formatting

Use `src/i18n/format.ts` for dates, USD amounts, numbers, and durations. Date-only values and SLA calculations remain UTC; amounts remain USD. Components can use `LocalTime` and `DateDisplay`, which read the active locale from `NextIntlClientProvider`.

## Errors and validation

Domain services and Server Actions return locale-independent message descriptors; forms translate them at the UI boundary. See `docs/i18n/errors.md` for the contract.

## Commands

```bash
pnpm i18n:check     # key, empty-value, and placeholder parity
pnpm typecheck      # typed message keys
pnpm test           # catalog, formatting, labels, and document tests
pnpm test:e2e       # includes the Greek authentication and locale journey
```

## Translation rules

- Translate locally; never send application strings to an external translation service.
- Keep keys, placeholders, ICU expressions, URLs, and code identifiers unchanged.
- Follow the glossary and style guide in `docs/i18n/`.
- Flag ambiguous terms, text expansion, and strings that need layout changes instead of inventing terminology.
