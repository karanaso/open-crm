import { config } from "dotenv";

// Load configuration before importing code that reads src/lib/env.ts.
config({ quiet: true });
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.local", quiet: true });
}

const USAGE = `Usage: pnpm exec tsx scripts/cleanup-listing-photos.ts [--apply]

Compares IMAGE_STORAGE_DIR/listings with listing_photos.storage_key.
Dry-run by default. --apply deletes orphan files; rows with missing files are
reported and never deleted.`;

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    return 0;
  }

  const unknown = args.filter((arg) => arg !== "--apply");
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown[0]}`);
    console.error(USAGE);
    return 2;
  }
  const apply = args.includes("--apply");

  const [{ cleanupListingPhotoStorage }, { imageStorageDir }, { sqlClient }] = await Promise.all([
    import("../src/lib/services/listing-photos"),
    import("../src/lib/env"),
    import("../src/db"),
  ]);

  try {
    const report = await cleanupListingPhotoStorage({ apply });

    console.log(`Listing photo cleanup (${apply ? "apply" : "dry run"})`);
    console.log(`Storage: ${imageStorageDir}`);
    console.log(`Database rows: ${report.rows}`);
    console.log(`Files found: ${report.files}`);
    console.log(`Orphan files: ${report.orphanFiles.length}`);
    console.log(`Rows with missing files: ${report.missingFiles.length}`);

    if (report.orphanFiles.length > 0) {
      console.log("");
      console.log("Orphan files (no listing_photos row):");
      for (const key of report.orphanFiles) console.log(`  ${key}`);
    }

    if (report.missingFiles.length > 0) {
      console.log("");
      console.log("Database rows with a missing file:");
      for (const key of report.missingFiles) console.log(`  ${key}`);
    }

    if (apply) {
      console.log("");
      console.log(`Deleted orphan files: ${report.deleted}`);
      if (report.failed.length > 0) {
        console.log(`Failed to delete: ${report.failed.length}`);
        for (const key of report.failed) console.log(`  ${key}`);
      }
    } else {
      console.log("");
      console.log("Dry run: no files changed. Re-run with --apply to delete orphan files.");
    }

    return report.failed.length > 0 ? 1 : 0;
  } finally {
    await sqlClient.end();
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
