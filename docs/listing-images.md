# Listing images

Listing photos are the only uploads OpenCRM accepts. Uploads are validated and
re-encoded on the server, stored outside `public/`, and served by a public,
read-only image route. This document covers the file layout, limits, metadata
handling, backup expectations, and orphan cleanup. Deployment/volume details also
appear in [`listing-storage.md`](./listing-storage.md).

## Configuration

| Variable            | Default                    | Purpose                                           |
| ------------------- | -------------------------- | ------------------------------------------------- |
| `IMAGE_STORAGE_DIR` | `./storage/listing-images` | Persistent directory for optimized listing images |

`src/lib/env.ts` resolves the value against the process working directory and
exports `imageStorageDir`. The directory is created on the first upload. Runtime
uploads must never be written to `public/`: a standalone Next.js deployment does
not reliably serve files added after build time, and container replacement loses
them.

## Storage layout and URLs

```text
$IMAGE_STORAGE_DIR/
  listings/
    <listingId>/
      <photoId>.webp
```

- `listingId` is the listing UUID.
- `photoId` is a UUID generated before the database insert. It is the stable file
  identity for the life of the photo.
- `listing_photos.position` controls display order. Reordering updates `position`
  in a transaction and never renames or moves a file.
- The stored file is always WebP. The database row records `storage_key`,
  `mime_type`, `width`, `height`, `byte_size`, and `position`.

The public URL maps directly to the storage key:

```text
storage key: listings/<listingId>/<photoId>.webp
public URL:  /images/listings/<listingId>/<photoId>.webp
```

Use the shared helpers in `src/lib/validation/listing-photo.ts`:

```ts
listingPhotoStorageKey(listingId, photoId); // listings/<listingId>/<photoId>.webp
listingPhotoPublicPath(storageKey); // /images/listings/<listingId>/<photoId>.webp
```

## Upload limits and processing

| Rule                     | Value                                   |
| ------------------------ | --------------------------------------- |
| Accepted types           | `image/jpeg`, `image/png`, `image/webp` |
| Maximum upload           | 8 MiB per file                          |
| Photos per listing       | 20                                      |
| Source dimensions        | at most 8000 × 8000 px                  |
| Stored long edge         | at most 2000 px                         |
| Output                   | WebP, quality 82                        |
| Server Action body limit | 8 MB (`next.config.ts`)                 |

The Server Action limit includes multipart overhead, so keep files slightly below
the 8 MiB ceiling; the service limit is the per-file maximum, not a guarantee that
the framework will accept an exactly-8 MiB upload.

`validateListingPhotoFile` runs before the file is read, so unsupported types and
oversized files are rejected cheaply. The service repeats the checks and then:

1. Reads the image with `sharp` and rejects unreadable content or a declared MIME
   type that does not match the actual format.
2. Rejects images above 8000 px on either side. `limitInputPixels` also guards
   against decompression bombs.
3. Applies the EXIF orientation, resizes the long edge to 2000 px without
   enlarging, and re-encodes to WebP.
4. Writes `listings/<listingId>/<photoId>.webp`, then inserts the row with
   `position = max(position) + 1`.
5. Removes the file again if the database insert fails.

Uploads take a row lock on the listing while computing the next position, so
concurrent uploads to the same listing cannot reuse a position. The per-listing
photo count is checked inside that transaction as well.

## Metadata and privacy

Re-encoding strips EXIF, GPS, XMP, and other embedded metadata. The orientation
tag is applied to the pixels first, so phone photos are not rotated incorrectly
when the metadata is removed. No original upload is retained.

Listing photos are public by design: the image route has no session check, and a
shared URL gives anyone access to that photo. Uploads never include seller,
agent, commission, or other CRM data, and the public listing API only exposes
photos for active listings. Deactivating a listing hides it from the API but
does not revoke a photo URL that is already known. Exact-address exposure
remains a product decision.

## Public image route

`GET /images/listings/[...key]` is implemented at
`src/app/images/listings/[...key]/route.ts` with `runtime = "nodejs"`.

- Builds the storage key from the route segments, rejects traversal (`..`, empty
  segments, backslashes, NUL bytes), and maps it to the explicit
  `listing_photos.storage_key`. Arbitrary files are never served.
- Reads the file from `IMAGE_STORAGE_DIR` only after the database lookup. A
  missing row or missing file returns `404`.
- Returns the MIME type stored on the row and:
  - `Cache-Control: public, max-age=31536000, immutable`
  - `X-Content-Type-Options: nosniff`
  - `Content-Length`

There is no directory listing and no write method. Deleting a photo removes its
row first, so the route returns `404` immediately even if an intermediate cache
still holds an old copy.

## Reorder and delete

- **Reorder** accepts a complete, duplicate-free permutation of every photo id
  for the listing. A foreign, missing, duplicate, or partial id set is rejected
  and positions are left unchanged. Files are not touched.
- **Delete** removes the row and then unlinks the file. An already-missing file
  is tolerated and reported as `missing`; the row is still removed. A failed
  unlink leaves an orphan file for the cleanup script.

## Persistence, backup, and standalone/Docker

Back up the PostgreSQL database and `IMAGE_STORAGE_DIR` together, in the same
maintenance window. A database-only backup leaves photo rows pointing at missing
files.

- Docker Compose mounts the named volume `crm_images` at
  `/app/storage/listing-images` and sets `IMAGE_STORAGE_DIR` to the same path.
  See `Dockerfile` and `docker-compose.yml`.
- For a bind mount, make the directory writable by the application user
  (UID/GID 1001 in the image) and keep it outside `public/`.
- Restoring the database without the image volume produces `404`s for existing
  photos; the cleanup script will report every row as a missing file.
- Replacing a container without a persistent volume loses all photos.
- `storage/` is ignored by Git. Do not commit uploaded images.

Full Docker/standalone instructions, permissions, and backup examples live in
[`listing-storage.md`](./listing-storage.md).

## Orphan cleanup

`scripts/cleanup-listing-photos.ts` compares
`$IMAGE_STORAGE_DIR/listings` with `listing_photos.storage_key`:

- **Orphan files**: files on disk without a database row. `--apply` deletes them.
- **Missing files**: rows without a file. These are reported but never deleted,
  because the row may be recoverable from a backup.

The default is a dry run.

```bash
# Dry run: report only, no changes
pnpm exec tsx scripts/cleanup-listing-photos.ts

# Delete orphan files (missing-file rows are still only reported)
pnpm exec tsx scripts/cleanup-listing-photos.ts --apply

# Usage
pnpm exec tsx scripts/cleanup-listing-photos.ts --help
```

The script loads `.env` and, outside production, `.env.local`; explicit environment
variables take precedence. It prints the storage directory, row count, file count, and both
problem lists, then exits with status `1` if any orphan file could not be
deleted. Review missing-file rows before deleting or restoring them by hand.

Run it from the application root so the relative `IMAGE_STORAGE_DIR` default
resolves correctly. Symlinks are skipped and only files under
`$IMAGE_STORAGE_DIR/listings` are considered.

### Verifying the commands against a temporary directory

The following sequence can be run locally without touching real storage or data.
It uses the disposable test database and a fresh temporary directory:

```bash
export IMAGE_STORAGE_DIR="$(mktemp -d)"
mkdir -p "$IMAGE_STORAGE_DIR/listings/11111111-1111-4111-8111-111111111111"
printf 'orphan' > "$IMAGE_STORAGE_DIR/listings/11111111-1111-4111-8111-111111111111/orphan.webp"

DATABASE_URL=postgres://postgres:postgres@localhost:5432/opencode_crm_test_media \
  pnpm exec tsx scripts/cleanup-listing-photos.ts
# Orphan files: 1

DATABASE_URL=postgres://postgres:postgres@localhost:5432/opencode_crm_test_media \
  pnpm exec tsx scripts/cleanup-listing-photos.ts --apply
# Deleted orphan files: 1
```

The image route can be smoke-tested by uploading a photo through a listing's
photo manager and opening its `/images/listings/...` URL, or by running the
integration suite:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/opencode_crm_test_media \
  pnpm exec vitest run --config vitest.integration.config.ts \
  tests/integration/listing-photos.test.ts
```
