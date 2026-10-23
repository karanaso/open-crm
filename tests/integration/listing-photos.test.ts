import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// The env module is imported by the app modules below, so point it at a temp
// directory before those modules are loaded in beforeAll.
const storageDir = await mkdtemp(path.join(tmpdir(), "opencrm-listing-photos-"));
process.env.IMAGE_STORAGE_DIR = storageDir;

let db: typeof import("@/db").db;
let schema: typeof import("@/db/schema");
let resetDatabase: typeof import("./helpers").resetDatabase;
let service: typeof import("@/lib/services/listing-photos");
let route: typeof import("@/app/images/listings/[...key]/route");

beforeAll(async () => {
  const [dbModule, schemaModule, helpers, serviceModule, routeModule] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("./helpers"),
    import("@/lib/services/listing-photos"),
    import("@/app/images/listings/[...key]/route"),
  ]);
  db = dbModule.db;
  schema = schemaModule;
  resetDatabase = helpers.resetDatabase;
  service = serviceModule;
  route = routeModule;
});

afterAll(async () => {
  await rm(storageDir, { recursive: true, force: true });
});

beforeEach(async () => {
  await resetDatabase();
  await rm(path.join(storageDir, "listings"), { recursive: true, force: true });
});

type Fixture = {
  userId: string;
  sellerId: string;
  listingId: string;
};

async function createFixture(reference = "RE-PHOTO"): Promise<Fixture> {
  const suffix = randomUUID();
  const [user] = await db
    .insert(schema.users)
    .values({
      email: `photo-${suffix}@example.com`,
      name: "Photo Agent",
      passwordHash: "test-only-hash",
    })
    .returning();
  const [seller] = await db
    .insert(schema.contacts)
    .values({
      firstName: "Sofia",
      lastName: "Seller",
      email: `seller-${suffix}@example.com`,
      ownerId: user.id,
    })
    .returning();
  const [listing] = await db
    .insert(schema.listings)
    .values({
      reference: `${reference}-${suffix.slice(0, 8).toUpperCase()}`,
      title: "Photo listing",
      transaction: "sale",
      price: "100000.00",
      currency: "EUR",
      propertyType: "apartment",
      sellerContactId: seller.id,
      ownerId: user.id,
    })
    .returning();
  return { userId: user.id, sellerId: seller.id, listingId: listing.id };
}

async function pngFile(width = 64, height = 48, name = "test.png") {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 12, g: 34, b: 56 },
    },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(buffer)], name, { type: "image/png" });
}

function storedPath(storageKey: string) {
  return path.join(storageDir, storageKey);
}

async function fileExists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getRoute(storageKey: string) {
  const key = storageKey.split("/").slice(1);
  return route.GET(new Request(`http://localhost/images/${storageKey}`), {
    params: Promise.resolve({ key }),
  });
}

describe("listing photo storage", () => {
  it("stores an optimized WebP file and row with the next position", async () => {
    const fixture = await createFixture();
    const first = await service.uploadListingPhoto(fixture.listingId, await pngFile(120, 80), {
      storageDir,
    });
    const second = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });

    expect(first).toMatchObject({
      listingId: fixture.listingId,
      mimeType: "image/webp",
      width: 120,
      height: 80,
      position: 0,
    });
    expect(second.position).toBe(1);
    expect(first.storageKey).toMatch(
      new RegExp(`^listings/${fixture.listingId}/[0-9a-f-]{36}\\.webp$`),
    );

    const filePath = storedPath(first.storageKey);
    expect(await fileExists(filePath)).toBe(true);
    const stored = await readFile(filePath);
    expect(stored.byteLength).toBe(first.byteSize);
    const metadata = await sharp(stored).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(120);
    expect(metadata.height).toBe(80);
    expect(metadata.exif).toBeUndefined();

    const rows = await db
      .select()
      .from(schema.listingPhotos)
      .where(eq(schema.listingPhotos.listingId, fixture.listingId));
    expect(rows.map((row) => row.position)).toEqual([0, 1]);
    expect(rows.every((row) => row.mimeType === "image/webp")).toBe(true);
  });

  it("caps the long edge at 2000 px", async () => {
    const fixture = await createFixture();
    const photo = await service.uploadListingPhoto(fixture.listingId, await pngFile(3000, 1000), {
      storageDir,
    });
    expect(photo.width).toBe(2000);
    expect(photo.height).toBe(667);
  });

  it("strips EXIF and GPS metadata by re-encoding", async () => {
    const fixture = await createFixture();
    const input = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .jpeg()
      .withExif({
        IFD0: { Copyright: "OpenCRM test", Make: "TestCam" },
        GPS: {
          GPSLatitudeRef: "N",
          GPSLatitude: "37/1 58/1 0/1",
          GPSLongitudeRef: "E",
          GPSLongitude: "23/1 43/1 0/1",
        },
      } as Parameters<ReturnType<typeof sharp>["withExif"]>[0])
      .toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const photo = await service.uploadListingPhoto(
      fixture.listingId,
      new File([new Uint8Array(input)], "gps.jpg", { type: "image/jpeg" }),
      { storageDir },
    );
    const output = await readFile(storedPath(photo.storageKey));
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects unsupported, unreadable, oversized, and over-dimension images", async () => {
    const fixture = await createFixture();

    await expect(
      service.uploadListingPhoto(
        fixture.listingId,
        new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" }),
        { storageDir },
      ),
    ).rejects.toThrow("JPEG, PNG, or WebP");

    await expect(
      service.uploadListingPhoto(
        fixture.listingId,
        new File([new Uint8Array([1, 2, 3])], "fake.png", { type: "image/png" }),
        { storageDir },
      ),
    ).rejects.toThrow("readable image");

    const tooLarge = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });
    await expect(
      service.uploadListingPhoto(fixture.listingId, tooLarge, { storageDir }),
    ).rejects.toThrow("8 MB");

    await expect(
      service.uploadListingPhoto(fixture.listingId, await pngFile(8001, 1), { storageDir }),
    ).rejects.toThrow("8000");
  });

  it("enforces the per-listing photo count", async () => {
    const fixture = await createFixture();
    await db.insert(schema.listingPhotos).values(
      Array.from({ length: 20 }, (_, index) => ({
        listingId: fixture.listingId,
        storageKey: `listings/${fixture.listingId}/${randomUUID()}.webp`,
        mimeType: "image/webp",
        position: index,
      })),
    );

    await expect(
      service.uploadListingPhoto(fixture.listingId, await pngFile(), { storageDir }),
    ).rejects.toThrow("at most 20");
  });

  it("returns not found for an unknown listing", async () => {
    await expect(
      service.uploadListingPhoto(randomUUID(), await pngFile(), { storageDir }),
    ).rejects.toThrow("not found");
  });

  it("removes the written file when the row insert fails", async () => {
    const fixture = await createFixture();

    await db.execute(sql`drop trigger if exists test_reject_listing_photo on listing_photos`);
    await db.execute(sql`
      create or replace function test_reject_listing_photo_fn()
      returns trigger language plpgsql as $$
      begin
        raise exception 'test rejection';
      end;
      $$
    `);
    await db.execute(sql`
      create trigger test_reject_listing_photo
      before insert on listing_photos
      for each row execute function test_reject_listing_photo_fn()
    `);

    try {
      await expect(
        service.uploadListingPhoto(fixture.listingId, await pngFile(), { storageDir }),
      ).rejects.toThrow();
    } finally {
      await db.execute(sql`drop trigger if exists test_reject_listing_photo on listing_photos`);
      await db.execute(sql`drop function if exists test_reject_listing_photo_fn()`);
    }

    const rows = await db
      .select()
      .from(schema.listingPhotos)
      .where(eq(schema.listingPhotos.listingId, fixture.listingId));
    expect(rows).toEqual([]);
    const files = await readdir(path.join(storageDir, "listings", fixture.listingId)).catch(
      () => [],
    );
    expect(files).toEqual([]);
  });
});

describe("listing photo reorder", () => {
  it("persists the new order without renaming files", async () => {
    const fixture = await createFixture();
    const first = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    const second = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    const firstPath = storedPath(first.storageKey);
    const secondPath = storedPath(second.storageKey);
    const firstBytes = await readFile(firstPath);

    const reordered = await service.reorderListingPhotos(fixture.listingId, [second.id, first.id]);

    expect(reordered.map((photo) => photo.id)).toEqual([second.id, first.id]);
    expect(reordered.map((photo) => photo.position)).toEqual([0, 1]);
    expect(reordered.map((photo) => photo.storageKey)).toEqual([
      second.storageKey,
      first.storageKey,
    ]);
    expect(await readFile(firstPath)).toEqual(firstBytes);
    expect(await fileExists(firstPath)).toBe(true);
    expect(await fileExists(secondPath)).toBe(true);
  });

  it("rejects cross-listing, duplicate, missing, and unknown ids", async () => {
    const fixture = await createFixture("RE-OWN");
    const other = await createFixture("RE-OTHER");
    const first = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    const second = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    const foreign = await service.uploadListingPhoto(other.listingId, await pngFile(), {
      storageDir,
    });

    await expect(
      service.reorderListingPhotos(fixture.listingId, [first.id, foreign.id]),
    ).rejects.toThrow("does not match");
    await expect(
      service.reorderListingPhotos(fixture.listingId, [first.id, first.id]),
    ).rejects.toThrow("does not match");
    await expect(service.reorderListingPhotos(fixture.listingId, [first.id])).rejects.toThrow(
      "does not match",
    );
    await expect(
      service.reorderListingPhotos(fixture.listingId, [first.id, randomUUID()]),
    ).rejects.toThrow("does not match");

    const unchanged = await db
      .select()
      .from(schema.listingPhotos)
      .where(eq(schema.listingPhotos.listingId, fixture.listingId));
    expect(unchanged.map((photo) => photo.id).sort()).toEqual([first.id, second.id].sort());
    expect(unchanged.map((photo) => photo.position).sort()).toEqual([0, 1]);
  });

  it("rejects reordering an unknown listing", async () => {
    await expect(service.reorderListingPhotos(randomUUID(), [])).rejects.toThrow("not found");
  });
});

describe("listing photo deletion", () => {
  it("removes the row and file", async () => {
    const fixture = await createFixture();
    const photo = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    const filePath = storedPath(photo.storageKey);
    expect(await fileExists(filePath)).toBe(true);

    const result = await service.deleteListingPhoto(photo.id, { storageDir });

    expect(result.photo.id).toBe(photo.id);
    expect(result.file).toBe("deleted");
    expect(await fileExists(filePath)).toBe(false);
    const rows = await db
      .select()
      .from(schema.listingPhotos)
      .where(eq(schema.listingPhotos.id, photo.id));
    expect(rows).toEqual([]);
    await expect(service.deleteListingPhoto(photo.id, { storageDir })).rejects.toThrow("not found");
  });

  it("tolerates an already missing file and reports it", async () => {
    const fixture = await createFixture();
    const photo = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    await unlink(storedPath(photo.storageKey));

    const result = await service.deleteListingPhoto(photo.id, { storageDir });
    expect(result.file).toBe("missing");
    const [row] = await db
      .select()
      .from(schema.listingPhotos)
      .where(eq(schema.listingPhotos.id, photo.id));
    expect(row).toBeUndefined();
  });
});

describe("public listing image route", () => {
  it("serves a recorded photo with immutable cache headers", async () => {
    const fixture = await createFixture();
    const photo = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });

    const response = await getRoute(photo.storageKey);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-length")).toBe(String(photo.byteSize));
    expect((await response.arrayBuffer()).byteLength).toBe(photo.byteSize);
  });

  it("returns 404 for deleted rows, unrecorded files, traversal, and missing files", async () => {
    const fixture = await createFixture();
    const photo = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });

    const orphanDir = path.join(storageDir, "listings", fixture.listingId);
    await mkdir(orphanDir, { recursive: true });
    await writeFile(path.join(orphanDir, "orphan.webp"), "not a recorded photo");
    expect((await getRoute(`listings/${fixture.listingId}/orphan.webp`)).status).toBe(404);

    expect((await getRoute(`listings/${randomUUID()}/${randomUUID()}.webp`)).status).toBe(404);

    const traversal = await route.GET(
      new Request("http://localhost/images/listings/../../etc/passwd"),
      { params: Promise.resolve({ key: ["..", "..", "etc", "passwd"] }) },
    );
    expect(traversal.status).toBe(404);

    await service.deleteListingPhoto(photo.id, { storageDir });
    expect((await getRoute(photo.storageKey)).status).toBe(404);

    const second = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    await unlink(storedPath(second.storageKey));
    expect((await getRoute(second.storageKey)).status).toBe(404);
  });
});

describe("listing photo cleanup", () => {
  it("reports orphans and missing files, then deletes orphans only on apply", async () => {
    const fixture = await createFixture();
    const photo = await service.uploadListingPhoto(fixture.listingId, await pngFile(), {
      storageDir,
    });
    const orphanKey = `listings/${fixture.listingId}/orphan.webp`;
    const missingKey = `listings/${fixture.listingId}/${randomUUID()}.webp`;
    await writeFile(storedPath(orphanKey), "orphan");
    await db.insert(schema.listingPhotos).values({
      listingId: fixture.listingId,
      storageKey: missingKey,
      mimeType: "image/webp",
      position: 99,
    });

    const dryRun = await service.cleanupListingPhotoStorage({ storageDir });
    expect(dryRun.rows).toBe(2);
    expect(dryRun.files).toBe(2);
    expect(dryRun.orphanFiles).toContain(orphanKey);
    expect(dryRun.missingFiles).toContain(missingKey);
    expect(dryRun.deleted).toBe(0);
    expect(await fileExists(storedPath(orphanKey))).toBe(true);
    expect(await fileExists(storedPath(photo.storageKey))).toBe(true);

    const applied = await service.cleanupListingPhotoStorage({ storageDir, apply: true });
    expect(applied.deleted).toBe(1);
    expect(applied.failed).toEqual([]);
    expect(await fileExists(storedPath(orphanKey))).toBe(false);
    expect(await fileExists(storedPath(photo.storageKey))).toBe(true);

    const [missingRow] = await db
      .select()
      .from(schema.listingPhotos)
      .where(eq(schema.listingPhotos.storageKey, missingKey));
    expect(missingRow).toBeDefined();
  });
});
