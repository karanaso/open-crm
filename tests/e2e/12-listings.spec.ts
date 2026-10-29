import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { createContact, createListing, login } from "./helpers";

test.describe.configure({ mode: "serial", timeout: 120_000 });

const SELLER = { firstName: "Sofia", lastName: "Seller", email: "sofia.seller@example.com" };
const BUYER = { firstName: "Nikos", lastName: "Viewer", email: "nikos.viewer@example.com" };

const SALE = {
  reference: "E2E-SALE-001",
  title: "E2E Sea View Apartment",
  price: "350000",
  commission: "7000",
};
const RENT = {
  reference: "E2E-RENT-001",
  title: "E2E Harbor Studio",
  price: "1200",
  commission: "1200",
};
const USD_SALE = {
  reference: "E2E-SALE-USD",
  title: "E2E Dollar Villa",
  price: "200000",
  commission: "4000",
};

let saleUrl = "";

function futureWallTime(daysAhead: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}T10:00`;
}

async function photoSources(page: Page) {
  return page
    .locator("img[src^='/images/listings/']")
    .evaluateAll((images) => images.map((image) => image.getAttribute("src")));
}

async function uploadPng(page: Page, name: string, color: { r: number; g: number; b: number }) {
  const buffer = await sharp({
    create: { width: 640, height: 480, channels: 3, background: color },
  })
    .png()
    .toBuffer();
  await page.setInputFiles("#photo-file", { name, mimeType: "image/png", buffer });
  await page.getByRole("button", { name: "Upload photo" }).click();
}

test.describe("real estate listings", () => {
  test("creates a seller contact without a company and a sale listing with features", async ({
    page,
  }) => {
    await login(page);
    await createContact(page, SELLER.firstName, SELLER.lastName, SELLER.email);

    saleUrl = await createListing(page, {
      reference: SALE.reference,
      title: SALE.title,
      sellerName: `${SELLER.firstName} ${SELLER.lastName}`,
      transaction: "sale",
      price: SALE.price,
      commission: SALE.commission,
      currency: "EUR",
      propertyType: "apartment",
      city: "Athens",
      features: ["#listing-feature-location-viewOfCoast", "#listing-feature-yard-swimmingPool"],
    });

    await expect(page.getByRole("heading", { name: SALE.title })).toBeVisible();
    await expect(page.getByText("€350,000.00", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("€7,000.00", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("View of Coast", { exact: true })).toBeVisible();
    await expect(page.getByText("Swimming Pool", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: `${SELLER.firstName} ${SELLER.lastName}` }),
    ).toBeVisible();
    await expect(page.getByText("For sale", { exact: true }).first()).toBeVisible();
  });

  test("creates a rent listing with a monthly period", async ({ page }) => {
    await login(page);

    await createListing(page, {
      reference: RENT.reference,
      title: RENT.title,
      sellerName: `${SELLER.firstName} ${SELLER.lastName}`,
      transaction: "rent",
      price: RENT.price,
      commission: RENT.commission,
      currency: "EUR",
      propertyType: "apartment",
      city: "Thessaloniki",
    });

    await expect(page.getByRole("heading", { name: RENT.title })).toBeVisible();
    await expect(page.getByText("€1,200.00", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("/ month", { exact: true })).toBeVisible();
    await expect(page.getByText("For rent", { exact: true }).first()).toBeVisible();
  });

  test("lists both listings and filters by transaction", async ({ page }) => {
    await login(page);
    await page.goto("/listings");

    await expect(page.getByRole("link", { name: SALE.title, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: RENT.title, exact: true })).toBeVisible();

    await page.selectOption('select[name="transaction"]', "rent");
    await page.getByRole("button", { name: "Filter" }).click();

    await expect(page).toHaveURL(/transaction=rent/);
    await expect(page.getByRole("link", { name: RENT.title, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: SALE.title, exact: true })).toHaveCount(0);
  });

  test("opens a listing edit page from its list row", async ({ page }) => {
    await login(page);
    await page.goto("/listings");

    const edit = page.getByRole("link", { name: `Edit ${SALE.title}` });
    await expect(edit).toHaveAttribute("href", /\/listings\/[0-9a-f-]+\/edit$/);
    await edit.click();
    await expect(page).toHaveURL(/\/listings\/[0-9a-f-]+\/edit$/);
    await expect(
      page.getByRole("heading", { name: `Edit listing ${SALE.reference}` }),
    ).toBeVisible();
  });

  test("deactivates and restores a listing", async ({ page }) => {
    await login(page);
    await page.goto(saleUrl);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Deactivate" }).click();
    await expect(page).toHaveURL(new RegExp(`${saleUrl.split("?")[0]}$`));
    await expect(page.getByText("Inactive listing", { exact: true })).toBeVisible();
    await expect(page.getByText("Deactivated on", { exact: true })).toBeVisible();

    await page.goto("/listings");
    await expect(page.getByRole("link", { name: SALE.title, exact: true })).toHaveCount(0);

    await page.goto("/listings?status=inactive");
    await expect(page.getByRole("link", { name: SALE.title, exact: true })).toBeVisible();

    await page.goto(saleUrl);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Inactive listing", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Deactivated on", { exact: true })).toHaveCount(0);

    await page.goto("/listings");
    await expect(page.getByRole("link", { name: SALE.title, exact: true })).toBeVisible();
  });

  test("uploads, reorders with the keyboard, and deletes listing photos", async ({ page }) => {
    await login(page);
    await page.goto(saleUrl);

    await expect(page.getByText("No photos yet.", { exact: true })).toBeVisible();

    await uploadPng(page, "e2e-front.png", { r: 20, g: 90, b: 180 });
    await expect(page.getByText("1 of 20 photos", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    const firstImage = page.locator("img[alt='Photo 1']");
    await expect(firstImage).toBeVisible();
    await expect
      .poll(() => firstImage.evaluate((image) => (image as HTMLImageElement).naturalWidth), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);

    await uploadPng(page, "e2e-garden.png", { r: 40, g: 150, b: 70 });
    await expect(page.getByText("2 of 20 photos", { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    const before = await photoSources(page);
    expect(before).toHaveLength(2);

    const moveUp = page.getByRole("button", { name: "Move photo 2 up" });
    await moveUp.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Photo order updated.", { exact: true })).toBeVisible();
    await expect.poll(async () => (await photoSources(page))[0]).toBe(before[1]);

    const reordered = await photoSources(page);
    expect(reordered).toEqual([before[1], before[0]]);

    await page.reload();
    await expect(page.locator("img[src^='/images/listings/']")).toHaveCount(2);
    expect(await photoSources(page)).toEqual(reordered);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete photo 1" }).click();
    await expect(page.getByText("Photo deleted.", { exact: true })).toBeVisible();
    await expect(page.getByText("1 of 20 photos", { exact: true })).toBeVisible();
    await expect(page.locator("img[src^='/images/listings/']")).toHaveCount(1);
  });

  test("schedules and completes a viewing", async ({ page }) => {
    await login(page);
    await createContact(page, BUYER.firstName, BUYER.lastName, BUYER.email);
    await page.goto(saleUrl);

    await page.locator("summary", { hasText: "Schedule viewing" }).click();
    await page.selectOption("#viewing-contact", {
      label: `${BUYER.firstName} ${BUYER.lastName}`,
    });
    await page.fill("#viewing-scheduled-at", futureWallTime(2));
    await page.fill("#viewing-notes", "E2E viewing at the lobby");
    await page.locator('button[type="submit"]', { hasText: "Schedule viewing" }).click();

    const upcoming = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: /^Upcoming/ }) });
    await expect(page.getByRole("heading", { name: "Upcoming (1)" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(upcoming.getByText(`${BUYER.firstName} ${BUYER.lastName}`)).toBeVisible();
    await expect(upcoming.getByText("Scheduled", { exact: true })).toBeVisible();

    await upcoming.getByRole("button", { name: "Complete" }).click();
    await expect(page.getByRole("heading", { name: "Upcoming (0)" })).toBeVisible({
      timeout: 30_000,
    });

    const past = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: /^Past/ }) });
    await expect(past.getByText(`${BUYER.firstName} ${BUYER.lastName}`)).toBeVisible();
    await expect(past.getByText("Completed", { exact: true })).toBeVisible();
  });

  test("logs an activity and creates a task on the listing", async ({ page }) => {
    await login(page);
    await page.goto(saleUrl);

    await page.selectOption("#activity-type", "call");
    await page.fill("#activity-subject", "E2E listing walkthrough call");
    await page.fill("#activity-body", "Logged from the listings E2E suite.");
    await page.getByRole("button", { name: "Log activity" }).click();
    await expect(page.getByText("E2E listing walkthrough call")).toBeVisible();

    await page.getByText("Add a task", { exact: true }).click();
    await page.fill("#task-title", "E2E listing follow-up");
    await page.getByRole("button", { name: "Create task" }).click();
    await expect(page.getByText("E2E listing follow-up", { exact: true })).toBeVisible();
  });

  test("shows the listings overview with separate currency rows", async ({ page }) => {
    await login(page);
    await createListing(page, {
      reference: USD_SALE.reference,
      title: USD_SALE.title,
      sellerName: `${SELLER.firstName} ${SELLER.lastName}`,
      transaction: "sale",
      price: USD_SALE.price,
      commission: USD_SALE.commission,
      currency: "USD",
      propertyType: "villa",
      city: "Athens",
    });

    await page.goto("/listings/dashboard");
    await expect(page.getByRole("heading", { name: "Listings overview" })).toBeVisible();

    const activeCard = page
      .locator("div.rounded-xl.border")
      .filter({ hasText: "Active listings" })
      .first();
    const saleCard = page.locator("div.rounded-xl.border").filter({ hasText: "For sale" }).first();
    const rentCard = page.locator("div.rounded-xl.border").filter({ hasText: "For rent" }).first();

    const active = Number((await activeCard.locator("p.text-2xl").innerText()).trim());
    const sale = Number((await saleCard.locator("p.text-2xl").innerText()).trim());
    const rent = Number((await rentCard.locator("p.text-2xl").innerText()).trim());

    expect(Number.isFinite(active)).toBe(true);
    expect(Number.isFinite(sale)).toBe(true);
    expect(Number.isFinite(rent)).toBe(true);
    expect(active).toBe(sale + rent);
    expect(sale).toBeGreaterThanOrEqual(2);
    expect(rent).toBeGreaterThanOrEqual(1);

    const asking = page
      .locator("div.rounded-xl.border")
      .filter({ hasText: "Asking value for sale" })
      .first();
    const askingRows = asking.locator("tbody tr");
    await expect(askingRows).toHaveCount(2);

    const eurRow = asking.locator("tbody tr").filter({ hasText: "EUR" });
    const usdRow = asking.locator("tbody tr").filter({ hasText: "USD" });
    await expect(eurRow).toHaveCount(1);
    await expect(usdRow).toHaveCount(1);
    await expect(eurRow).toContainText("€");
    await expect(eurRow).not.toContainText("$");
    await expect(usdRow).toContainText("$");
    await expect(usdRow).not.toContainText("€");

    // Per-currency cells never carry two currency symbols, and there is no
    // combined cross-currency total row.
    for (const cell of await asking.locator("tbody td").allInnerTexts()) {
      const symbols = Number(cell.includes("€")) + Number(cell.includes("$"));
      expect(symbols).toBeLessThanOrEqual(1);
    }

    const rentRoll = page
      .locator("div.rounded-xl.border")
      .filter({ hasText: "Monthly rent roll" })
      .first();
    await expect(rentRoll.locator("tbody tr")).toHaveCount(1);
    await expect(rentRoll.locator("tbody tr").filter({ hasText: "EUR" })).toHaveCount(1);
    await expect(rentRoll).toContainText("€");
    await expect(rentRoll).toContainText("/ month");
    await expect(
      page
        .getByText("Totals are grouped by currency and never converted.", { exact: true })
        .first(),
    ).toBeVisible();
  });

  test("anonymous listing request redirects to sign-in with a callback URL", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/listings");
    await expect(page).toHaveURL(/\/login/);
    expect(page.url()).toContain("callbackUrl=%2Flistings");
    await context.close();
  });

  test("public listings API responds without a session and leaks no private fields", async ({
    request,
  }) => {
    const response = await request.get("/api/public/v1/listings");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    const text = JSON.stringify(body);
    expect(text).not.toContain("commissionAmount");
    expect(text).not.toContain("sellerContactId");
    expect(text).not.toContain("ownerId");
  });
});
