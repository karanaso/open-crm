import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { THEMES, THEME_MODES } from "@/lib/theme/config";

const css = readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");

const PALETTE_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--chart-6",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
] as const;

const SEMANTIC_TOKENS = [
  "--destructive",
  "--destructive-foreground",
  "--success",
  "--success-foreground",
  "--warning",
  "--warning-foreground",
  "--info",
  "--info-foreground",
] as const;

function declarations(selector: string) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Missing selector: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  if (open === -1 || close === -1) throw new Error(`Malformed block: ${selector}`);
  return css.slice(open + 1, close);
}

describe("theme token contract", () => {
  it("defines the complete light palette on every theme", () => {
    for (const theme of THEMES) {
      const selector = theme === "default" ? '[data-theme="default"]' : `[data-theme="${theme}"]`;
      const block = declarations(selector);
      for (const token of PALETTE_TOKENS) {
        expect(block, `${selector} is missing ${token}`).toContain(`${token}:`);
      }
    }
  });

  it("defines the complete dark palette on every theme", () => {
    for (const theme of THEMES) {
      const selector = `.dark[data-theme="${theme}"]`;
      const block = declarations(selector);
      for (const token of PALETTE_TOKENS) {
        expect(block, `${selector} is missing ${token}`).toContain(`${token}:`);
      }
    }
  });

  it("keeps semantic status colors mode-aware and outside theme blocks", () => {
    const light = declarations('[data-theme="default"]');
    const dark = declarations('.dark[data-theme="default"]');
    for (const token of SEMANTIC_TOKENS) {
      expect(light, `light tokens are missing ${token}`).toContain(`${token}:`);
      expect(dark, `dark tokens are missing ${token}`).toContain(`${token}:`);
    }

    expect(light).toContain("color-scheme: light");
    expect(dark).toContain("color-scheme: dark");
  });

  it("maps every new token through Tailwind", () => {
    for (const token of [
      "success",
      "success-foreground",
      "warning",
      "warning-foreground",
      "info",
      "info-foreground",
      "destructive-foreground",
      "chart-6",
    ]) {
      expect(css).toContain(`--color-${token}: var(--${token});`);
    }
  });

  it("covers exactly the supported theme and mode identifiers", () => {
    expect(THEMES).toHaveLength(5);
    expect(THEME_MODES).toHaveLength(3);
    for (const theme of THEMES) {
      expect(css).toContain(`[data-theme="${theme}"]`);
    }
  });
});
