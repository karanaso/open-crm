import { config } from "dotenv";

config();
if (process.env.NODE_ENV !== "production") {
  config({ path: ".env.local", override: true });
}

async function main() {
  await import("./seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
