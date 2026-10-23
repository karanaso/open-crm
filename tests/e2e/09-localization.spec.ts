import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createCompany, createContact, login } from "./helpers";

test.describe.configure({ mode: "serial" });

const COMPANY = "E2E Greek Directory Co";
const CONTACT = {
  firstName: "Eleni",
  lastName: "Greek",
  email: "eleni.greek@example.com",
};
const DEAL = "E2E Greek Deal";
const TICKET = "E2E Greek support ticket";
const SEGMENT = "E2E Greek VIP segment";
const CAMPAIGN = "E2E Greek campaign";
const MARKETING_CONTACT = {
  firstName: "Mia",
  lastName: "Market",
  email: "mia.localization@example.com",
};
const ACTIVITY = "E2E Greek kickoff call";
const TASK = "E2E Greek follow-up";

let companyUrl = "";

async function switchLocale(page: Page, locale: "en" | "el") {
  await page.goto("/settings/profile");

  const current = await page.locator("html").getAttribute("lang");
  if (current !== locale) {
    const triggerName = current === "el" ? "Γλώσσα" : "Language";
    const optionName =
      locale === "el"
        ? current === "el"
          ? "Ελληνικά"
          : "Greek"
        : current === "el"
          ? "Αγγλικά"
          : "English";

    await page.getByRole("combobox", { name: triggerName }).click();
    await page.getByRole("option", { name: optionName }).click();
  }

  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}

test.describe("Greek localization journey", () => {
  test("switches the admin interface to Greek", async ({ page }) => {
    await login(page);
    await switchLocale(page, "el");

    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page.getByRole("link", { name: "Πίνακας ελέγχου" })).toBeVisible();

    // The profile preference is mirrored into the locale cookie, so a reload keeps Greek.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page.getByRole("link", { name: "Εταιρείες" })).toBeVisible();
  });

  test("creates, links, archives, and restores directory records in Greek", async ({ page }) => {
    await login(page);

    await page.goto("/companies");
    await expect(page.getByRole("heading", { name: "Εταιρείες" })).toBeVisible();

    await createCompany(page, COMPANY, "e2e-greek-directory.example");
    companyUrl = page.url();
    const companyMain = page.locator("main");
    await expect(companyMain.getByText("Επαφές", { exact: true }).first()).toBeVisible();
    await expect(companyMain.getByText("Στοιχεία", { exact: true }).first()).toBeVisible();
    await expect(companyMain.getByText("Με μια ματιά", { exact: true })).toBeVisible();

    await createContact(
      page,
      CONTACT.firstName,
      CONTACT.lastName,
      CONTACT.email,
      COMPANY,
    );
    await expect(page.getByText("Στοιχεία επαφής", { exact: true })).toBeVisible();
    await expect(page.getByText("Με μια ματιά", { exact: true })).toBeVisible();

    await page.goto(companyUrl);
    await expect(
      page.getByRole("link", { name: `${CONTACT.firstName} ${CONTACT.lastName}` }),
    ).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Αρχειοθέτηση" }).click();
    await expect(page).toHaveURL(/\/companies$/);

    await page.goto(companyUrl);
    await expect(page.getByText("Αρχειοθετημένη εταιρεία", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Επαναφορά" }).click();
    await expect(page.getByText("Αρχειοθετημένη εταιρεία", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Αρχειοθέτηση" })).toBeVisible();
  });

  test("reports Greek CSV import labels and row reasons", async ({ page }) => {
    await login(page);

    await page.goto("/import?target=companies");
    await expect(page.getByRole("heading", { name: "Εισαγωγή CSV" })).toBeVisible();

    await page.setInputFiles("#import-file", {
      name: "e2e-greek-partial.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Company Name,Domain\nE2E Greek Import Co,e2e-greek-import.example\n,e2e-greek-missing.example",
      ),
    });
    await expect(page.getByRole("heading", { name: "Αντιστοίχιση στηλών" })).toBeVisible();
    await page.getByRole("button", { name: "Εισαγωγή CSV" }).click();

    await expect(page.getByText("Η εισαγωγή ολοκληρώθηκε", { exact: true })).toBeVisible();
    await expect(page.getByText("1 εισήχθη", { exact: true })).toBeVisible();
    await expect(page.getByText("1 μη έγκυρη γραμμή", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Το όνομα εταιρείας είναι υποχρεωτικό.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Γραμμή" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Αιτία" })).toBeVisible();
  });

  test("wins a deal in Greek and reports an occupied stage", async ({ page }) => {
    await login(page);

    await page.goto("/deals/new");
    await expect(page.getByRole("heading", { name: "Νέα συμφωνία" })).toBeVisible();
    await page.fill("#name", DEAL);
    await page.selectOption("#companyId", { label: COMPANY });
    await page.selectOption("#contactId", {
      label: `${CONTACT.firstName} ${CONTACT.lastName}`,
    });
    await page.fill("#amount", "25000");
    await page.fill("#expectedCloseDate", "2026-12-15");
    await page.getByRole("button", { name: "Δημιουργία συμφωνίας" }).click();
    await page.waitForURL(/\/deals\/[0-9a-f-]+$/, { timeout: 30000 });

    await expect(page.getByRole("heading", { name: DEAL })).toBeVisible();
    await expect(page.getByText("Επισκόπηση συμφωνίας", { exact: true })).toBeVisible();

    await page.selectOption("#deal-stage", { label: "Won" });
    await page.getByRole("button", { name: "Ενημέρωση σταδίου" }).click();
    await expect(page.getByText("Το στάδιο ενημερώθηκε.", { exact: true })).toBeVisible();
    await expect(page.getByText("Κερδισμένη", { exact: true })).toBeVisible();
    await expect(page.getByText(/Αλλαγή σταδίου/)).toBeVisible();

    await page.goto("/settings/pipelines");
    await expect(page.getByRole("heading", { name: "Ροές πωλήσεων" })).toBeVisible();

    const defaultPipeline = page
      .locator("div.rounded-xl.border")
      .filter({ hasText: "Προεπιλεγμένη" })
      .first();
    await expect(defaultPipeline).toBeVisible();

    const occupiedStageRow = defaultPipeline
      .locator("tr")
      .filter({ has: page.locator('input[name="name"][value="Won"]') });
    await expect(occupiedStageRow).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await occupiedStageRow.getByRole("button", { name: "Αφαίρεση" }).click();

    await expect(page).toHaveURL(/\/settings\/pipelines\?error=OCCUPIED_STAGE/);
    await expect(
      page.getByText(
        "Αυτό το στάδιο περιέχει ακόμη συμφωνίες και δεν μπορεί να αφαιρεθεί.",
        { exact: true },
      ),
    ).toBeVisible();
  });

  test("records a Greek lost deal and requires a lost reason", async ({ page }) => {
    await login(page);

    await page.goto("/deals/new");
    await expect(page.getByRole("heading", { name: "Νέα συμφωνία" })).toBeVisible();
    await page.fill("#name", "E2E Greek Lost Deal");
    await page.selectOption("#companyId", { label: COMPANY });
    await page.selectOption("#contactId", {
      label: `${CONTACT.firstName} ${CONTACT.lastName}`,
    });
    await page.fill("#amount", "12000");
    await page.getByRole("button", { name: "Δημιουργία συμφωνίας" }).click();
    await page.waitForURL(/\/deals\/[0-9a-f-]+$/, { timeout: 30000 });

    await page.selectOption("#deal-stage", { label: "Lost" });
    await page.getByRole("button", { name: "Ενημέρωση σταδίου" }).click();
    await expect(
      page.getByText("Προσθέστε έναν λόγο απώλειας πριν μετακινήσετε τη συμφωνία.", {
        exact: true,
      }),
    ).toBeVisible();

    await page.fill("#deal-lost-reason", "Χάθηκε λόγω τιμής");
    await page.getByRole("button", { name: "Ενημέρωση σταδίου" }).click();
    await expect(page.getByText("Χαμένη", { exact: true })).toBeVisible();
    await expect(page.getByText("Χάθηκε λόγω τιμής")).toBeVisible();
  });

  test("records a Greek ticket reply, internal note, status, and SLA state", async ({ page }) => {
    await login(page);

    await page.goto("/tickets/new");
    await expect(page.getByRole("heading", { name: "Νέο δελτίο" })).toBeVisible();
    await page.fill("#subject", TICKET);
    await page.fill("#description", "Ο πελάτης δεν μπορεί να ολοκληρώσει τη σύνδεση SSO.");
    await page.fill('input[aria-label="Αναζήτηση αιτούντων"]', CONTACT.email);
    const requesterValue = await page
      .locator("#requesterContactId option")
      .nth(1)
      .getAttribute("value");
    await page.selectOption("#requesterContactId", requesterValue!);
    await page.selectOption("#priority", "high");
    await page.getByRole("button", { name: "Δημιουργία δελτίου" }).click();
    await page.waitForURL(/\/tickets\/[0-9a-f-]+$/, { timeout: 30000 });

    await expect(page.getByRole("heading", { name: TICKET })).toBeVisible();
    await expect(page.getByText("Πρώτη απάντηση", { exact: true })).toBeVisible();
    await expect(page.getByText("Επίλυση", { exact: true })).toBeVisible();
    await expect(page.getByText("Αναμονή απάντησης", { exact: true })).toBeVisible();
    await expect(page.getByText(/Στόχος:.*Υψηλή/).first()).toBeVisible();

    await page.fill("#comment-body", "Διερευνούμε το πρόβλημα σύνδεσης.");
    await page.getByRole("button", { name: "Προσθήκη σχολίου" }).click();
    await expect(page.getByText("Διερευνούμε το πρόβλημα σύνδεσης.")).toBeVisible();
    await expect(page.getByText("Απάντηση", { exact: true })).toBeVisible();
    await expect(page.getByText(/Εντός στόχου/).first()).toBeVisible();

    await page.selectOption('select[name="visibility"]', "internal");
    await page.fill("#comment-body", "Εσωτερική σημείωση: ελέγξτε τα logs του παρόχου.");
    await page.getByRole("button", { name: "Προσθήκη σχολίου" }).click();

    const internalNote = page.locator("li", {
      hasText: "Εσωτερική σημείωση: ελέγξτε τα logs του παρόχου.",
    });
    await expect(internalNote.getByText("Εσωτερική σημείωση", { exact: true })).toBeVisible();
    await expect(internalNote.getByText(/Εσωτερική σημείωση:/)).toBeVisible();

    await page.getByRole("button", { name: "Σε εξέλιξη", exact: true }).click();
    await expect(page.getByText("Σε εξέλιξη", { exact: true }).first()).toBeVisible();
  });

  test("creates a Greek segment and campaign and tracks engagement", async ({ page }) => {
    await login(page);

    await page.goto("/contacts/new");
    await expect(page.getByRole("heading", { name: "Νέα επαφή" })).toBeVisible();
    await page.fill("#firstName", MARKETING_CONTACT.firstName);
    await page.fill("#lastName", MARKETING_CONTACT.lastName);
    await page.fill("#email", MARKETING_CONTACT.email);
    await page.selectOption("#companyId", { label: COMPANY });
    await page.fill("#tags", "greek-vip");
    await page.getByRole("button", { name: "Δημιουργία επαφής" }).click();
    await page.waitForURL(/\/contacts\/[0-9a-f-]+$/, { timeout: 30000 });

    await page.goto("/segments/new");
    await expect(page.getByRole("heading", { name: "Νέο τμήμα" })).toBeVisible();
    await page.fill("#name", SEGMENT);
    await page.fill("#tags", "greek-vip");
    await page.getByRole("button", { name: "Δημιουργία τμήματος" }).click();
    await page.waitForURL(/\/segments\/[0-9a-f-]+$/, { timeout: 30000 });

    await expect(page.getByRole("heading", { name: SEGMENT })).toBeVisible();
    await expect(page.getByText("Επαφές που ταιριάζουν (1)", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: `${MARKETING_CONTACT.firstName} ${MARKETING_CONTACT.lastName}`,
      }),
    ).toBeVisible();

    await page.goto("/campaigns/new");
    await expect(page.getByRole("heading", { name: "Νέα καμπάνια" })).toBeVisible();
    await page.fill("#name", CAMPAIGN);
    const segmentValue = await page
      .locator("#segmentId option", { hasText: SEGMENT })
      .getAttribute("value");
    await page.selectOption("#segmentId", segmentValue!);
    await page.getByRole("button", { name: "Δημιουργία καμπάνιας" }).click();
    await page.waitForURL(/\/campaigns\/[0-9a-f-]+$/, { timeout: 30000 });

    await expect(page.getByRole("heading", { name: CAMPAIGN })).toBeVisible();
    await expect(page.getByText("Πρόχειρη", { exact: true })).toBeVisible();
    await expect(page.getByText("Κοινό", { exact: true })).toBeVisible();
    await expect(page.getByText("Ποσοστό απόκρισης", { exact: true })).toBeVisible();
    await expect(page.getByText("Ποσοστό μετατροπής", { exact: true })).toBeVisible();
    await expect(page.getByText("Προϋπολογισμός", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Ενεργοποίηση" }).click();
    await expect(page.getByText("Ενεργή", { exact: true })).toBeVisible();
    await expect(page.getByText("Κοινό και αλληλεπίδραση", { exact: true })).toBeVisible();

    const recipientRow = page.locator("tr", {
      hasText: `${MARKETING_CONTACT.firstName} ${MARKETING_CONTACT.lastName}`,
    });
    await expect(recipientRow).toBeVisible();
    await recipientRow.locator('select[name="status"]').selectOption("responded");
    await recipientRow.getByRole("button", { name: "Αποθήκευση" }).click();

    await expect(recipientRow.locator('select[name="status"]')).toHaveValue("responded");
    await expect(
      recipientRow.locator("td").nth(1).getByText("Απάντησε", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Απάντησε: 1", { exact: true })).toBeVisible();

    const responseCard = page
      .locator("div.rounded-xl.border")
      .filter({ hasText: "Ποσοστό απόκρισης" })
      .first();
    await expect(responseCard.getByText("100,0%", { exact: true })).toBeVisible();
  });

  test("logs a Greek activity and completes and reopens a Greek task", async ({ page }) => {
    await login(page);
    await page.goto(companyUrl);

    await expect(
      page.getByText("Καταγραφή δραστηριότητας", { exact: true }).first(),
    ).toBeVisible();
    await page.selectOption("#activity-type", "call");
    await page.fill("#activity-subject", ACTIVITY);
    await page.fill("#activity-body", "Καταγράφηκε από τη δοκιμή E2E.");
    await page.getByRole("button", { name: "Καταγραφή δραστηριότητας" }).click();

    await expect(page.getByText(ACTIVITY, { exact: true })).toBeVisible();
    await expect(page.getByText(/Κλήση ·/)).toBeVisible();

    const activityItem = page.locator("li", { hasText: ACTIVITY }).first();
    await activityItem.getByRole("button", { name: "Επεξεργασία" }).click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByRole("heading", { name: "Επεξεργασία δραστηριότητας" }),
    ).toBeVisible();
    await expect(editDialog.locator("#activity-subject")).toHaveValue(ACTIVITY);
    await editDialog.getByRole("button", { name: "Ακύρωση" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByText("Προσθήκη εργασίας", { exact: true }).click();
    await page.fill("#task-title", TASK);
    await page.getByRole("button", { name: "Δημιουργία εργασίας" }).click();
    await expect(page.getByText(TASK, { exact: true })).toBeVisible();

    const tasksCard = page
      .locator("div.rounded-xl.border")
      .filter({ hasText: "Προσθήκη εργασίας" })
      .first();

    const openTask = tasksCard.locator("li", { hasText: TASK }).first();
    await openTask.getByRole("button", { name: "Ολοκλήρωση" }).click();

    await expect(page.getByText("Ολοκληρωμένες (1)", { exact: true })).toBeVisible();
    await page.getByText("Ολοκληρωμένες (1)", { exact: true }).click();
    await tasksCard.getByRole("button", { name: "Επανάνοιγμα" }).click();

    await expect(
      tasksCard.locator("li", { hasText: TASK }).getByRole("button", { name: "Ολοκλήρωση" }),
    ).toBeVisible();
  });

  test("shows Greek dashboard metrics and grouped search results", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Ανοιχτή ροή πωλήσεων", { exact: true })).toBeVisible();
    await expect(page.getByText("Ανοιχτά δελτία", { exact: true })).toBeVisible();
    await expect(page.getByText("Ενεργές καμπάνιες", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Αξία ανοιχτών συμφωνιών ανά στάδιο", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Πρόσφατη δραστηριότητα", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Αναζήτηση εταιρειών/ }).click();
    const dialog = page.getByRole("dialog");
    const searchInput = dialog.getByPlaceholder(
      "Αναζήτηση εταιρειών, επαφών, συμφωνιών, δελτίων, καμπανιών…",
    );
    await expect(searchInput).toBeVisible();

    await searchInput.fill("G");
    await expect(
      dialog.getByText("Πληκτρολογήστε τουλάχιστον δύο χαρακτήρες για αναζήτηση."),
    ).toBeVisible();

    await searchInput.fill("Greek");
    await expect(dialog.getByText("Εταιρείες", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Επαφές", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Συμφωνίες", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Δελτία υποστήριξης", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Καμπάνιες", { exact: true })).toBeVisible();
    await expect(dialog.getByText(COMPANY, { exact: true }).first()).toBeVisible();
  });

  test("keeps the Greek accessibility baseline and mobile navigation usable", async ({ page }) => {
    await login(page);

    await expect(page.locator("html")).toHaveAttribute("lang", "el");
    await expect(page.getByRole("button", { name: /Αναζήτηση εταιρειών/ })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const navButton = page.getByRole("button", { name: "Άνοιγμα πλοήγησης" });
    await expect(navButton).toBeVisible();

    await navButton.focus();
    await page.keyboard.press("Enter");

    const mobileNav = page.getByRole("dialog");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Εταιρείες" })).toBeVisible();
    await expect(mobileNav.getByRole("button", { name: "Κλείσιμο" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(mobileNav).toHaveCount(0);
    await expect(navButton).toBeFocused();

    await page.setViewportSize({ width: 1280, height: 900 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("nextjs-portal")
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    // Documented baseline: the Greek dashboard must have no serious or critical axe violations.
    console.log(
      `Greek dashboard axe: ${results.violations.length} total violations, ${serious.length} serious/critical.`,
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test("restores the admin interface to English", async ({ page }) => {
    await login(page);
    await switchLocale(page, "en");

    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });
});
