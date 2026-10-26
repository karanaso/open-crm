import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RootDocument } from "@/components/layout/root-document";
import en from "../../messages/en.json";
import el from "../../messages/el.json";

function render(
  theme: "default" | "violet",
  themeMode: "light" | "dark" | "system",
  locale: "en" | "el" = "en",
) {
  return renderToStaticMarkup(
    <RootDocument
      locale={locale}
      messages={locale === "el" ? el : en}
      theme={theme}
      themeMode={themeMode}
    >
      <main>Content</main>
    </RootDocument>,
  );
}

describe("RootDocument", () => {
  it("sets the document language to Greek", () => {
    const html = render("default", "light", "el");

    expect(html).toContain('lang="el"');
    expect(html).toContain("Content");
  });

  it("renders the theme and explicit light mode", () => {
    const html = render("violet", "light");

    expect(html).toContain('data-theme="violet"');
    expect(html).toContain('data-mode="light"');
    expect(html).not.toContain('class="dark"');
  });

  it("adds the dark class for explicit dark mode", () => {
    const html = render("violet", "dark");

    expect(html).toContain('data-mode="dark"');
    expect(html).toContain('class="dark"');
  });

  it("adds the system-mode script and leaves the class to the browser", () => {
    const html = render("default", "system");

    expect(html).toContain('data-mode="system"');
    expect(html).not.toContain('class="dark"');
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain("dataset.mode");
  });
});
