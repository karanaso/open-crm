# Spec Delta

## Purpose

Expose active listings to an unauthenticated public consumer as stable, read-only JSON while withholding seller, agent, commission, and internal CRM data.

## ADDED Requirements

### Requirement: Public listing collection

`GET /api/public/v1/listings` MUST return active listings without authentication, with pagination, stable field names, and only public listing fields. It MUST support filters for transaction, property type, city, bedrooms, features, currency, and price range, and sorting by newest or price within a currency. Inactive listings MUST NOT appear.

#### Scenario: Anonymous client lists listings

- **WHEN** a client calls the collection endpoint without a session
- **THEN** the response contains active listings and no authentication challenge

#### Scenario: Inactive listing is excluded

- **WHEN** an inactive listing exists
- **THEN** the collection response does not include it

#### Scenario: Filters are applied

- **WHEN** a client filters by transaction, city, and bedrooms
- **THEN** only matching active listings are returned

#### Scenario: Pagination is stable

- **WHEN** a client requests a page and page size within the allowed maximum
- **THEN** the response returns that page and metadata with the total count

#### Scenario: Invalid parameter is rejected

- **WHEN** a client sends an unknown enum value or an out-of-range page
- **THEN** the API returns a validation error with a stable error code

### Requirement: Public listing detail

`GET /api/public/v1/listings/{id}` MUST return one active listing by its stable identifier without authentication, or return not found when the listing does not exist or is inactive. The response MUST use the same public projection as the collection.

#### Scenario: Active listing is returned

- **WHEN** a client requests an active listing by identifier
- **THEN** the API returns its public fields and ordered photos

#### Scenario: Inactive listing is not found

- **WHEN** a client requests an inactive listing by identifier
- **THEN** the API returns not found without revealing internal state

#### Scenario: Missing listing is not found

- **WHEN** a client requests an identifier that does not exist
- **THEN** the API returns not found

### Requirement: Public projection and privacy

The public API MUST expose only allowlisted fields: identifier, reference, title, description, transaction, property type, price, currency, rent period, address, core property facts, grouped features, ordered photos, and listed and updated timestamps. It MUST NOT expose seller contact details, agent or user records, commission amount, internal notes, deactivation metadata, activities, tasks, or any other CRM record.

#### Scenario: Seller is not exposed

- **WHEN** a public listing response is inspected
- **THEN** it contains no seller contact identifier, name, email, or phone

#### Scenario: Commission is not exposed

- **WHEN** a public listing response is inspected
- **THEN** it contains no commission amount or commission rate

#### Scenario: Agent and user data are not exposed

- **WHEN** a public listing response is inspected
- **THEN** it contains no agent or user identifier, name, email, or role

#### Scenario: Photos are ordered

- **WHEN** a public listing has multiple photos
- **THEN** they are returned in the stored display order with public URLs

### Requirement: Currency-safe public filtering

Price filters and price sorting MUST require a currency parameter. Requests that would compare prices across currencies MUST be rejected with a validation error. Every listing response MUST include its own price currency.

#### Scenario: Price filter without currency is rejected

- **WHEN** a client sends a minimum or maximum price without a currency
- **THEN** the API rejects the request with a validation error

#### Scenario: Price filter uses one currency

- **WHEN** a client filters by a price range and a currency
- **THEN** only listings in that currency within the range are returned

#### Scenario: Currency is present in every result

- **WHEN** a listing is returned
- **THEN** its price currency is included in the response

### Requirement: Public API operations

Public responses MUST include cache headers suitable for public consumption, CORS for GET requests, a stable JSON error shape, and per-client rate limiting. The API MUST be versioned in the path. Errors MUST NOT expose database messages, stack traces, or internal identifiers.

#### Scenario: Cacheable response

- **WHEN** a client fetches the public collection
- **THEN** the response includes public cache headers and does not require a session cookie

#### Scenario: Cross-origin GET is allowed

- **WHEN** a browser client from another origin sends a GET request
- **THEN** the response includes CORS headers that allow the read

#### Scenario: Rate limit is exceeded

- **WHEN** a client exceeds the public read limit
- **THEN** the API returns a rate-limit error and a retry hint

#### Scenario: Internal error is hidden

- **WHEN** the database or server fails
- **THEN** the response contains a generic error code without internal details

#### Scenario: API is versioned

- **WHEN** a client calls an unversioned public listing path
- **THEN** the API does not serve the public listing contract from that path
