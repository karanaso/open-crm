# Public listings API

OpenCRM exposes a versioned, unauthenticated, read-only JSON API for active property
listings. It is intended for a separate public website or listing feed. This is the
only unauthenticated data surface in the application; no other CRM record is exposed.

- Base paths: `/api/public/v1/listings` and `/api/public/v1/listings/{id}`
- No session, cookie, API key, or authorization header is required
- Only listings with `status = 'active'` are returned
- The path is versioned; unversioned alternatives are not part of this contract

## Endpoints

| Method    | Path                           | Purpose                                      |
| --------- | ------------------------------ | -------------------------------------------- |
| `GET`     | `/api/public/v1/listings`      | List active listings with filters and paging |
| `GET`     | `/api/public/v1/listings/{id}` | Return one active listing by UUID            |
| `OPTIONS` | Both paths                     | CORS preflight                               |

Both handlers run on the Node.js runtime. They never call the session guard and never
set an authentication challenge.

An `{id}` that is not a UUID is rejected with `400 INVALID_PARAMETER`. A well-formed
identifier that does not exist, or that belongs to an inactive listing, returns
`404 NOT_FOUND`. The response does not reveal whether the listing existed before it was
deactivated.

## Response shapes

### Collection

```json
{
  "data": [
    {
      "id": "6f1c8f38-4c11-4a7a-9f0f-9e4b7a8c1d22",
      "reference": "RE-1024",
      "title": "Seaside apartment",
      "description": "Two-bedroom apartment near the coast.",
      "transaction": "sale",
      "propertyType": "apartment",
      "price": 250000,
      "currency": "EUR",
      "pricePeriod": null,
      "addressLine1": "12 Marina Street",
      "city": "Athens",
      "region": "Attica",
      "postalCode": "10432",
      "country": "GR",
      "bedrooms": 2,
      "bathrooms": 1.5,
      "sizeSqm": 95.5,
      "lotSqm": 120,
      "yearBuilt": 2005,
      "floors": 3,
      "parking": 1,
      "energyClass": "a",
      "features": {
        "location": { "viewOfCoast": true },
        "yard": { "swimmingPool": true }
      },
      "listedAt": "2026-03-01T09:00:00.000Z",
      "updatedAt": "2026-03-04T12:30:00.000Z",
      "photos": [
        {
          "id": "b5b5e4b2-0f3a-4b5c-8d7e-0a1b2c3d4e5f",
          "url": "https://crm.example.com/images/listings/6f1c8f38-4c11-4a7a-9f0f-9e4b7a8c1d22/b5b5e4b2-0f3a-4b5c-8d7e-0a1b2c3d4e5f.webp",
          "alt": "Living room",
          "position": 0,
          "width": 1600,
          "height": 900
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "pageCount": 1
  }
}
```

### Detail

The example below is abbreviated; a real response contains every allowlisted field.

```json
{
  "data": {
    "id": "6f1c8f38-4c11-4a7a-9f0f-9e4b7a8c1d22",
    "reference": "RE-1024",
    "title": "Seaside apartment",
    "transaction": "sale",
    "propertyType": "apartment",
    "price": 250000,
    "currency": "EUR",
    "pricePeriod": null,
    "features": {},
    "listedAt": "2026-03-01T09:00:00.000Z",
    "updatedAt": "2026-03-04T12:30:00.000Z",
    "photos": []
  }
}
```

The detail projection is identical to a collection item. All allowlisted fields are
always present; optional values are `null`, and `photos` is an empty array when a listing
has no photos. Money and area values are JSON numbers; timestamps are ISO 8601 strings in
UTC.

### Public fields

| Field          | Type                 | Notes                                                                      |
| -------------- | -------------------- | -------------------------------------------------------------------------- |
| `id`           | string (UUID)        | Stable listing identifier                                                  |
| `reference`    | string               | Agency reference                                                           |
| `title`        | string               | Listing title                                                              |
| `description`  | string \| null       | Public description                                                         |
| `transaction`  | `"sale"` \| `"rent"` | Sale or rental listing                                                     |
| `propertyType` | string enum          | `apartment`, `house`, `villa`, `maisonette`, `plot`, `commercial`, `other` |
| `price`        | number               | Asking price or rent amount in `currency`                                  |
| `currency`     | string               | Three-letter ISO 4217 code, for example `EUR`                              |
| `pricePeriod`  | `"month"` \| null    | Set for rent listings, `null` for sales                                    |
| `addressLine1` | string \| null       | Public address line                                                        |
| `city`         | string \| null       | City                                                                       |
| `region`       | string \| null       | Region                                                                     |
| `postalCode`   | string \| null       | Postal code                                                                |
| `country`      | string \| null       | Country                                                                    |
| `bedrooms`     | integer, `0..1000`   | all                                                                        | Minimum bedroom count, not an exact match |
| `bathrooms`    | number \| null       | Bathroom count, one decimal                                                |
| `sizeSqm`      | number \| null       | Interior size in square metres                                             |
| `lotSqm`       | number \| null       | Lot/plot size in square metres                                             |
| `yearBuilt`    | integer \| null      | Construction year                                                          |
| `floors`       | integer \| null      | Floor count                                                                |
| `parking`      | integer \| null      | Parking spaces                                                             |
| `energyClass`  | string \| null       | `a_plus`, `a`, `b`, `c`, `d`, `e`, `f`, `g`                                |
| `features`     | object               | Grouped feature flags; only selected keys are present and `true`           |
| `listedAt`     | string (ISO 8601)    | When the listing was published                                             |
| `updatedAt`    | string (ISO 8601)    | Last public-record update                                                  |
| `photos`       | array                | Ordered public photos                                                      |

Each photo has exactly `id`, `url`, `alt` (string or `null`), `position`, `width` (number
or `null`), and `height` (number or `null`). Photos are ordered by `position`, with the
photo identifier as a stable tie-breaker. Storage keys and MIME metadata are not exposed.

### Photo URLs

Photo URLs are absolute. They are built from the configured public application origin
(`AUTH_URL`, exposed as `appUrl`) plus the photo storage key:

```text
storage key:  listings/<listingId>/<photoId>.webp
public URL:   <AUTH_URL origin>/images/listings/<listingId>/<photoId>.webp
```

The unauthenticated image route serves only keys recorded in `listing_photos` and never
serves files outside the configured storage directory. See
[listing-storage.md](./listing-storage.md) for `IMAGE_STORAGE_DIR`, deployment, backup,
and orphan-cleanup details.

## Query parameters

The collection endpoint accepts the following parameters. Unknown parameter names are
ignored; invalid values for known parameters return `400 INVALID_PARAMETER`.

| Parameter      | Type / values                                                              | Default  | Notes                                                                                      |
| -------------- | -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `page`         | integer, `1..10000`                                                        | `1`      | 1-based page number                                                                        |
| `pageSize`     | integer, `1..100`                                                          | `20`     | Page size                                                                                  |
| `transaction`  | `sale`, `rent`                                                             | all      |                                                                                            |
| `propertyType` | `apartment`, `house`, `villa`, `maisonette`, `plot`, `commercial`, `other` | all      |                                                                                            |
| `city`         | string                                                                     | all      | Case-insensitive partial match                                                             |
| `bedrooms`     | integer, `0..1000`                                                         | all      | Minimum bedroom count, not an exact match                                                  |
| `currency`     | three letters                                                              | all      | Case-insensitive input, normalized to uppercase; required with price filters or price sort |
| `minPrice`     | number, `0..999999999999.99`                                               | all      | Inclusive, compared only inside `currency`                                                 |
| `maxPrice`     | number, `0..999999999999.99`                                               | all      | Inclusive, must be `>= minPrice`                                                           |
| `features`     | comma-separated `group.key` values, maximum 50                             | all      | Every selected feature must be present; AND semantics                                      |
| `sort`         | `newest`, `price_asc`, `price_desc`                                        | `newest` | `newest` is `listedAt` descending                                                          |

All filters combine with AND. Feature filters combine with AND, so
`features=yard.swimmingPool,location.viewOfCoast` returns listings that have both the
pool and the coast view. A missing feature key means `false`; unknown keys are rejected.
The feature catalog is defined in `src/lib/listing-features.ts`.

### Currency rule

There is no FX conversion. `minPrice`, `maxPrice`, `sort=price_asc`, and
`sort=price_desc` require `currency`; a request without it returns:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "currency is required when filtering or sorting by price"
  }
}
```

Price filters and price sorting only compare listings whose own `currency` matches the
requested currency. Every returned listing always includes its own `currency`.

### Pagination

`meta.total` is the number of active listings matching the filters. `meta.pageCount` is
`max(1, ceil(total / pageSize))`. A page beyond the last page returns `data: []` with the
same total and page count.

## Errors

Every error uses a stable envelope:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "pageSize must be at most 100"
  }
}
```

| Status | Code                | Meaning                                                                                                                                     |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | `INVALID_PARAMETER` | An unknown enum value, out-of-range page, malformed UUID, missing currency for a price operation, unknown feature, or invalid numeric value |
| `404`  | `NOT_FOUND`         | The listing does not exist or is inactive                                                                                                   |
| `429`  | `RATE_LIMITED`      | The per-client limit was exceeded                                                                                                           |
| `500`  | `INTERNAL_ERROR`    | An unexpected server or database failure                                                                                                    |

Internal errors never include database messages, SQL, stack traces, or internal record
identifiers. Error responses use `Cache-Control: no-store` and still include CORS headers.

## Caching and CORS

Successful collection and detail responses:

```text
Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

`GET` responses include:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

`OPTIONS` returns `204 No Content` with the same CORS headers and
`Access-Control-Max-Age: 86400`. CORS is intended for browser clients on another origin.
The endpoints do not read or set cookies.

## Rate limits

The default local limit is **60 requests per 60-second fixed window per client**. The
client key is derived from the first hop in `X-Forwarded-For`, then `X-Real-IP`, and is
hashed before it is used in memory. When neither header is present, clients share an
`unknown` bucket. `OPTIONS` requests are not counted. The reverse proxy MUST overwrite
`X-Forwarded-For` rather than append to it; an append-only proxy leaves a spoofable
client-supplied first hop.
When the limit is exceeded:

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 42
```

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry later."
  }
}
```

The limiter is in-memory and per process. It is a safety net for a single instance, not a
distributed quota; in multi-instance deployments put a rate limiter at the reverse proxy
or edge and treat this limit as a fallback. If you run behind a proxy, make sure it
overwrites `X-Forwarded-For` or sets `X-Real-IP`; direct clients otherwise share the
`unknown` bucket.

## Privacy boundary

The public projection is an explicit allowlist. The API never exposes:

- seller contact id, name, email, phone, or any other seller field
- owner, agent, or user id, name, email, or role
- commission amount or commission rate
- `status`, `deactivatedAt`, or any internal state metadata
- internal notes or descriptions other than the public listing description
- activities, tasks, viewings, deals, tickets, campaigns, segments, or any other CRM record
- photo MIME types, byte sizes, filesystem paths, or internal storage metadata
  beyond the public photo URL itself

Inactive listings are excluded from the collection and return `404` from the detail
endpoint. Adding a new internal database column does not add it to this API; the service
selects named public columns only.

Address fields and listing photos are public by design. Enter only information that may
be published in the listing's public description and address; do not put seller or
internal notes there.

## Examples

### List active sale apartments in Athens, EUR, with a pool

```bash
curl -sS "https://crm.example.com/api/public/v1/listings?transaction=sale&propertyType=apartment&city=Athens&bedrooms=2&currency=EUR&minPrice=150000&maxPrice=400000&features=yard.swimmingPool&sort=price_asc&page=1&pageSize=20"
```

### Fetch one listing

```bash
curl -sS "https://crm.example.com/api/public/v1/listings/6f1c8f38-4c11-4a7a-9f0f-9e4b7a8c1d22"
```

### Price sort without a currency

```bash
curl -sS -i "https://crm.example.com/api/public/v1/listings?sort=price_asc"
```

```text
HTTP/1.1 400 Bad Request
Access-Control-Allow-Origin: *
Cache-Control: no-store

{"error":{"code":"INVALID_PARAMETER","message":"currency is required when filtering or sorting by price"}}
```

### CORS preflight

```bash
curl -sS -i -X OPTIONS "https://crm.example.com/api/public/v1/listings" \
  -H "Origin: https://www.example.com" \
  -H "Access-Control-Request-Method: GET"
```

```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

## Configuration notes

- Set `AUTH_URL` to the public origin (for example `https://crm.example.com`) so photo
  URLs are absolute and reachable by the public consumer. In development the fallback is
  `http://localhost:3000`.
- Listing photos are stored under `IMAGE_STORAGE_DIR`; they are public by design and are
  served by the unauthenticated image route. Never store private documents there.
- The API is versioned in the path. Breaking changes should introduce a new version
  instead of changing `/api/public/v1`.
