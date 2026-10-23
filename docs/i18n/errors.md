# Error and Validation Messages

User-facing errors are locale-independent in the domain layer and translated at the presentation boundary. Services and Server Actions never return English display sentences as their contract.

## Error descriptors

```ts
type MessageDescriptor = {
  key: string;
  params?: Record<string, string | number>;
};
```

`AppError` carries a stable `code` and optional `params`. The `message` is diagnostic for logs and tests; it is never rendered.

```ts
throw new AppError("Company not found", "NOT_FOUND");
```

Use `errorDescriptor(error)` to convert any thrown value into a descriptor:

- `AppError` → `{ key: "errors.<CODE>", params }`
- `UnauthorizedError` → `errors.UNAUTHORIZED`
- `ForbiddenError` → `errors.FORBIDDEN`
- Anything else → `errors.GENERIC` (and the diagnostic is logged)

`errorCode(error)` returns `<CODE>` without the `errors.` prefix, for redirect query parameters.

## Server Action state

```ts
type ActionState = {
  error?: MessageDescriptor;
  fieldErrors?: Record<string, MessageDescriptor[]>;
  success?: MessageDescriptor;
  inviteUrl?: string;
  resetUrl?: string;
  report?: ImportReport;
} | null;
```

Server Actions return descriptors, not strings:

```ts
try {
  await updateCompany(companyId, input);
} catch (error) {
  return { error: errorDescriptor(error) };
}

return { success: { key: "settings.profileUpdated" } };
```

For redirect-based mutations, redirect with the code and let the page translate it:

```ts
redirect(`/companies/${id}?error=${encodeURIComponent(errorCode(error))}`);
```

Pages render `<PageError code={error} />`. Unknown codes fall back to `errors.GENERIC`.

## Validation

Zod schemas use `validation.*` keys instead of English sentences:

```ts
email: z.string().trim().min(1, "validation.emailRequired").email("validation.email"),
amount: z.coerce.number().min(0, "validation.amountNonNegative"),
tags: z.array(z.string().max(40, "validation.tagLength")).max(20, "validation.maxTags"),
```

`fieldErrorsFromZod(error)` converts each issue into a descriptor by path. `zodIssueDescriptor(issue)` maps standard Zod codes (required, min, max, email, uuid, invalid option) and preserves custom `validation.*` keys. Numeric limits are passed as `{ min }` or `{ max }` parameters.

```ts
if (!parsed.success) {
  return { fieldErrors: fieldErrorsFromZod(parsed.error) };
}
```

## Rendering

- `FormError` renders a banner for `state.error`.
- `FormSuccess` renders a banner for `state.success`.
- `FormField` renders its `error` descriptor under the field.
- `FieldError` renders a standalone field-level error, such as a cross-field link error.
- `useMessageTranslator()` returns a function that accepts a string key or a descriptor and returns the active-locale text.

Forms must not render `AppError.message` or raw service strings.

## Adding a new code or key

1. Add the code to `ERROR_CODES` in `src/lib/errors.ts`.
2. Add `errors.<CODE>` to both `messages/en.json` and `messages/el.json`.
3. Add the test coverage in `tests/unit/errors.test.ts` if the mapping is not already covered.
4. Run `pnpm i18n:check`, `pnpm typecheck`, and `pnpm test`.

For validation, add the `validation.*` key to both catalogs and use it in the schema. Keep placeholders identical in both locales.

## Rules

- Do not translate stored enum values, user data, names, emails, URLs, or code identifiers.
- Do not return English sentences from services as the user-facing contract.
- Do not expose diagnostic messages, stack traces, or internal identifiers in the UI.
- Do not log secrets, tokens, passwords, or customer data.
