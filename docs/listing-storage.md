# Listing image storage

Listing photos are the only uploads OpenCRM accepts. Files are written to a
persistent directory outside `public/` and are served by the public listing image
route; the directory must survive container replacement and be included in backups.

## Configuration

| Variable            | Default                    | Purpose                                         |
| ------------------- | -------------------------- | ----------------------------------------------- |
| `IMAGE_STORAGE_DIR` | `./storage/listing-images` | Writable directory for optimized listing images |

`src/lib/env.ts` resolves the value against the process working directory and exports
`imageStorageDir`. Relative paths are resolved once at startup, so run the process from
the application root (the Docker image uses `/app`).

Layout under the configured directory:

```text
listings/<listingId>/<photoId>.webp
```

`photoId` is a UUID assigned at upload and never changes. Display order lives in
`listing_photos.position`, so reordering does not rename or move files. The public URL
is `/images/listings/<listingId>/<photoId>.webp`; photo URLs for inactive listings
remain fetchable if the URL is already known, so deactivate a listing rather than
treating deactivation as a way to revoke a leaked image URL.

## Local development

The default directory is `./storage/listing-images`. It is ignored by Git
(`storage/` in `.gitignore`). Create it before the first upload:

```bash
mkdir -p ./storage/listing-images
```

Do not write runtime uploads into `public/`. With `output: "standalone"`, files added
to `public/` after the image is built are not reliably served and are lost when the
container is replaced.

## Docker and standalone deployment

The runner stage of the `Dockerfile` creates `/app/storage/listing-images`, owns it as
`nextjs:nodejs` (UID/GID 1001), and sets:

```text
IMAGE_STORAGE_DIR=/app/storage/listing-images
```

`docker-compose.yml` mounts the named volume `crm_images` at that path:

```yaml
volumes:
  - crm_images:/app/storage/listing-images
```

Start the database, run migrations, then start the app:

```bash
docker compose up -d db
DATABASE_URL=postgres://... pnpm db:migrate
docker compose up -d app
```

For a plain `docker run` deployment, mount the same volume and set the same variable:

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@db:5432/opencode_crm \
  -e AUTH_SECRET=... \
  -e AUTH_URL=https://crm.example.com \
  -e AUTH_TRUST_HOST=true \
  -e IMAGE_STORAGE_DIR=/app/storage/listing-images \
  -v crm_images:/app/storage/listing-images \
  opencrm
```

### Permissions

The application user must be able to create directories and files under
`IMAGE_STORAGE_DIR`. The image prepares `/app/storage/listing-images` with the correct
owner. If you use a bind mount instead of a named volume, set ownership explicitly:

```bash
sudo chown -R 1001:1001 /srv/opencrm/listing-images
```

Symptoms of a bad mount are `EACCES`/`EPERM` on upload and missing files for photos
whose database rows still exist.

## Backup and restore

Back up the PostgreSQL database and `IMAGE_STORAGE_DIR` together. A database-only
backup leaves listings with photo rows that point at missing files.

- Docker volume: snapshot or archive the volume named `<compose-project>_crm_images`.
- Bind mount: archive the mounted directory with the database dump taken in the same
  maintenance window.
- Restore both before starting the app. Keep file permissions owned by UID/GID 1001.
- Test storage restores by opening a listing photo through the image route.

Listing photos are public by design. The image route is unauthenticated, so never
store private documents or non-listing attachments in this directory. Upload handling
is expected to re-encode images and remove EXIF/GPS metadata before writing.

## Smoke test

With `IMAGE_STORAGE_DIR` loaded from the environment, verify the directory is writable:

```bash
pnpm exec tsx -e '
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageStorageDir } from "./src/lib/env";

void (async () => {
  const file = path.join(imageStorageDir, ".smoke-test");
  await mkdir(imageStorageDir, { recursive: true });
  await writeFile(file, "listing-storage-ok");
  const value = await readFile(file, "utf8");
  await rm(file);
  console.log(imageStorageDir, value);
})();
'
```

The command must print the resolved path and `listing-storage-ok`.
