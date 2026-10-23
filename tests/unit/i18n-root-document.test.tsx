import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RootDocument } from "@/components/layout/root-document";
import en from "../../messages/en.json";
import el from "../../messages/el.json";

describe("RootDocument", () => {
  it("sets the document language to Greek", () => {
    const html = renderToStaticMarkup(
      <RootDocument locale="el" messages={el}>
        <main>Περιεχόμενο</main>
      </RootDocument>,
    );

    expect(html).toContain('lang="el"');
    expect(html).toContain("Περιεχόμενο");
  });

  it("sets the document language to English", () => {
    const html = renderToStaticMarkup(
      <RootDocument locale="en" messages={en}>
        <main>Content</main>
      </RootDocument>,
    );

    expect(html).toContain('lang="en"');
    expect(html).toContain("Content");
  });
});
