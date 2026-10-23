import en from "../messages/en.json";
import el from "../messages/el.json";
import { compareCatalogs, flattenCatalog } from "../src/i18n/catalog";

const issues = compareCatalogs(en, el);

if (issues.length > 0) {
  for (const issue of issues) {
    const detail = issue.detail ? ` (${issue.detail})` : "";
    console.error(`[i18n] ${issue.type}: ${issue.locale}.${issue.key}${detail}`);
  }
  console.error(`\n[i18n] ${issues.length} issue(s) found`);
  process.exit(1);
}

console.log(`[i18n] catalogs match (${flattenCatalog(en).size} keys)`);
