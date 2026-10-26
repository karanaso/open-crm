import { describe, expect, it } from "vitest";
import {
  htmlToMessageText,
  inspectMessageBody,
  messageBodyErrorDescriptor,
  plainTextToHtml,
  sanitizeMessageHtml,
} from "@/lib/messaging/html";
import {
  MAX_MESSAGE_HTML_LENGTH,
  MAX_MESSAGE_TEXT_LENGTH,
} from "@/lib/messaging/limits";
import {
  escapeHtml,
  findSplitMergeFields,
  findUnsupportedMergeFields,
  renderHtmlMergeFields,
  renderMergeFields,
} from "@/lib/messaging/render";

describe("sanitizeMessageHtml", () => {
  it("keeps supported formatting, lists, links, and HTTPS images", () => {
    const html = [
      "<p><strong>Bold</strong> <b>Bold two</b> <em>Italic</em> <i>Italic two</i>",
      "<u>Under</u> <s>Strike</s></p>",
      "<ul><li>One</li></ul><ol><li>Two</li></ol>",
      '<p><a href="https://example.com" title="Example">Link</a></p>',
      '<p><img src="https://example.com/logo.png" alt="Logo" width="100"></p>',
    ].join("");

    const result = sanitizeMessageHtml(html);

    expect(result).toContain("<strong>Bold</strong>");
    expect(result).toContain("<em>Italic</em>");
    expect(result).toContain("<u>Under</u>");
    expect(result).toContain("<s>Strike</s>");
    expect(result).toContain("<ul><li>One</li></ul>");
    expect(result).toContain("<ol><li>Two</li></ol>");
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('src="https://example.com/logo.png"');
    expect(result).toContain('alt="Logo"');
  });

  it("removes scripts, styles, iframes, forms, and event handlers", () => {
    const result = sanitizeMessageHtml(
      [
        '<p onclick="alert(1)">Hello</p>',
        "<script>alert(1)</script>",
        "<style>body { color: red; }</style>",
        '<iframe src="https://example.com"></iframe>',
        "<form><p>Form content</p></form>",
      ].join(""),
    );

    expect(result).toContain("<p>Hello</p>");
    expect(result).not.toContain("script");
    expect(result).not.toContain("style");
    expect(result).not.toContain("iframe");
    expect(result).not.toContain("form");
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("Form content");
  });

  it("removes unsafe and relative link URLs but keeps the link text", () => {
    for (const href of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "/relative",
      "//example.com/path",
    ]) {
      const result = sanitizeMessageHtml(`<a href="${href}">Click</a>`);
      expect(result, href).toContain("Click");
      expect(result, href).not.toContain("href=");
    }
  });

  it("keeps http, https, and mailto links", () => {
    expect(sanitizeMessageHtml('<a href="http://example.com">HTTP</a>')).toContain(
      'href="http://example.com"',
    );
    expect(sanitizeMessageHtml('<a href="https://example.com">HTTPS</a>')).toContain(
      'href="https://example.com"',
    );
    expect(sanitizeMessageHtml('<a href="mailto:hello@example.com">Email</a>')).toContain(
      'href="mailto:hello@example.com"',
    );
  });

  it("drops non-HTTPS and relative images", () => {
    for (const src of [
      "http://example.com/logo.png",
      "data:image/png;base64,abc",
      "cid:logo",
      "/relative.png",
      "//example.com/logo.png",
    ]) {
      const result = sanitizeMessageHtml(`<p><img src="${src}" alt="Logo"></p>`);
      expect(result, src).not.toContain("<img");
    }
  });

  it("strips image event handlers while keeping a safe source", () => {
    const result = sanitizeMessageHtml(
      '<img src="https://example.com/logo.png" onerror="alert(1)" alt="Logo">',
    );
    expect(result).toContain('src="https://example.com/logo.png"');
    expect(result).toContain('alt="Logo"');
    expect(result).not.toContain("onerror");
  });

  it("is idempotent", () => {
    const once = sanitizeMessageHtml(
      '<p onclick="alert(1)"><a href="https://example.com">Link</a></p><img src="https://example.com/logo.png">',
    );
    expect(sanitizeMessageHtml(once)).toBe(once);
  });

  it("returns an empty string for empty input", () => {
    expect(sanitizeMessageHtml("")).toBe("");
    expect(sanitizeMessageHtml("   ")).toBe("");
  });
});

describe("htmlToMessageText", () => {
  it("converts paragraphs, formatting, entities, and links", () => {
    const text = htmlToMessageText(
      '<p>Hello <strong>world</strong> &amp; <a href="https://example.com">example</a></p>',
    );

    expect(text).toContain("Hello world & example");
    expect(text).toContain("https://example.com");
    expect(text).not.toContain("<");
  });

  it("preserves block and line breaks", () => {
    expect(htmlToMessageText("<p>Line one<br>Line two</p><p>Line three</p>")).toBe(
      "Line one\nLine two\n\nLine three",
    );
  });

  it("keeps list items and image alt text", () => {
    const text = htmlToMessageText(
      '<ul><li>One</li><li>Two</li></ul><p><img src="https://example.com/logo.png" alt="Logo"></p>',
    );
    expect(text).toContain("One");
    expect(text).toContain("Two");
    expect(text).toContain("Logo");
  });

  it("can omit images for content checks", () => {
    expect(
      htmlToMessageText('<p><img src="https://example.com/logo.png" alt="Logo"></p>', {
        includeImages: false,
      }),
    ).toBe("");
  });

  it("returns an empty string for empty HTML", () => {
    expect(htmlToMessageText("")).toBe("");
    expect(htmlToMessageText("<p> </p>")).toBe("");
  });

  it("keeps long lists beyond the old child-node threshold", () => {
    const html = `<ul>${Array.from(
      { length: 1001 },
      (_, index) => `<li>Item ${index}</li>`,
    ).join("")}</ul>`;
    const text = htmlToMessageText(html);
    expect(text).toContain("Item 1000");
    expect(text).not.toContain("...");
  });
});

describe("plainTextToHtml", () => {
  it("converts blank lines to paragraphs and single lines to breaks", () => {
    expect(plainTextToHtml("Hi\n\nThere\nline")).toBe(
      "<p>Hi</p><p>There<br />line</p>",
    );
  });

  it("escapes HTML and normalizes Windows line endings", () => {
    expect(plainTextToHtml('<script> & "x"\r\nnext')).toBe(
      "<p>&lt;script&gt; &amp; &quot;x&quot;<br />next</p>",
    );
  });

  it("returns an empty string for empty input", () => {
    expect(plainTextToHtml("")).toBe("");
    expect(plainTextToHtml("   \n ")).toBe("");
  });
});

describe("HTML merge fields", () => {
  it("escapes recipient values", () => {
    expect(
      renderHtmlMergeFields("<p>Hi {{firstName}} from {{company}}</p>", {
        firstName: "Ada",
        company: "Smith & Sons",
      }),
    ).toBe("<p>Hi Ada from Smith &amp; Sons</p>");
  });

  it("renders missing values as empty strings", () => {
    expect(renderHtmlMergeFields("<p>{{company}}</p>", {})).toBe("<p></p>");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(renderHtmlMergeFields("<p>{{email}}</p>", {})).toBe("<p>{{email}}</p>");
  });

  it("renders placeholders in allowed attributes", () => {
    expect(
      renderHtmlMergeFields(
        '<a href="mailto:{{firstName}}@example.com">Mail</a>',
        { firstName: "Ada" },
      ),
    ).toBe('<a href="mailto:Ada@example.com">Mail</a>');
  });

  it("finds placeholders split by formatting markup", () => {
    expect(
      findSplitMergeFields("<p>{{<strong>firstName</strong>}}</p>", "{{firstName}}"),
    ).toEqual(["firstName"]);
    expect(findSplitMergeFields("<p>{{firstName}}</p>", "{{firstName}}")).toEqual([]);
  });

  it("finds unknown placeholders in HTML and text", () => {
    expect(findUnsupportedMergeFields("<p>{{email}}</p>")).toEqual(["email"]);
    expect(findUnsupportedMergeFields('<a href="mailto:{{phone}}@example.com">Mail</a>')).toEqual([
      "phone",
    ]);
    expect(findUnsupportedMergeFields("{{email-address}}")).toEqual(["email-address"]);
  });

  it("escapes single quotes and renders plain text without escaping", () => {
    expect(escapeHtml("O'Reilly")).toBe("O&#39;Reilly");
    expect(renderMergeFields("{{company}}", { company: "Smith & Sons" })).toBe(
      "Smith & Sons",
    );
  });
});

describe("inspectMessageBody", () => {
  it("sanitizes HTML and derives its text alternative", () => {
    const result = inspectMessageBody({
      bodyHtml: '<p>Hi {{firstName}}</p><script>alert(1)</script>',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toBe("Hi {{firstName}}");
      expect(result.bodyHtml).toContain("<p>Hi {{firstName}}</p>");
      expect(result.bodyHtml).not.toContain("script");
    }
  });

  it("accepts entity whitespace around supported placeholders", () => {
    const result = inspectMessageBody({
      bodyHtml: "<p>Hi {{&nbsp;company&nbsp;}}</p>",
    });
    expect(result.ok).toBe(true);
  });

  it("keeps text-only legacy bodies without HTML", () => {
    const result = inspectMessageBody({ body: "Hi {{firstName}}" });
    expect(result).toEqual({ ok: true, body: "Hi {{firstName}}", bodyHtml: null });
  });

  it("prefers HTML when both body sources are supplied", () => {
    const result = inspectMessageBody({
      body: "plain",
      bodyHtml: "<p>HTML</p>",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toBe("HTML");
      expect(result.bodyHtml).toBe("<p>HTML</p>");
    }
  });

  it("rejects empty and content-free bodies", () => {
    expect(inspectMessageBody({})).toMatchObject({ ok: false, error: { code: "required" } });
    expect(inspectMessageBody({ body: "   " })).toMatchObject({
      ok: false,
      error: { code: "required" },
    });
    expect(inspectMessageBody({ bodyHtml: "<p> </p>" })).toMatchObject({
      ok: false,
      error: { code: "required" },
    });
    expect(inspectMessageBody({ bodyHtml: "<script>alert(1)</script>" })).toMatchObject({
      ok: false,
      error: { code: "required" },
    });
    expect(
      inspectMessageBody({
        bodyHtml: '<p><img src="https://example.com/logo.png" alt="Logo"></p>',
      }),
    ).toMatchObject({ ok: false, error: { code: "required" } });
    expect(inspectMessageBody({ bodyHtml: "<p>{{company}}</p>" })).toMatchObject({
      ok: false,
      error: { code: "required" },
    });
    expect(inspectMessageBody({ body: "{{company}}" })).toMatchObject({
      ok: false,
      error: { code: "required" },
    });
  });

  it("handles deeply nested HTML without throwing", () => {
    const result = inspectMessageBody({
      bodyHtml: `<p>${"<b>".repeat(5000)}Hi${"</b>".repeat(5000)}</p>`,
    });
    expect(typeof result.ok).toBe("boolean");
  });

  it("rejects unsupported placeholders in HTML text and attributes", () => {
    expect(inspectMessageBody({ bodyHtml: "<p>{{email}}</p>" })).toMatchObject({
      ok: false,
      error: { code: "unsupported_merge_fields", fields: ["email"] },
    });
    expect(
      inspectMessageBody({
        bodyHtml: '<a href="mailto:{{phone}}@example.com">Mail</a>',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "unsupported_merge_fields", fields: ["phone"] },
    });
  });

  it("rejects formatted placeholders", () => {
    expect(
      inspectMessageBody({ bodyHtml: "<p>{{<strong>firstName</strong>}}</p>" }),
    ).toMatchObject({
      ok: false,
      error: { code: "split_merge_fields", fields: ["firstName"] },
    });
  });

  it("rejects over-limit HTML and text", () => {
    const longHtml = `<p>${"a".repeat(MAX_MESSAGE_HTML_LENGTH)}</p>`;
    expect(inspectMessageBody({ bodyHtml: longHtml })).toMatchObject({
      ok: false,
      error: { code: "too_long", part: "html", max: MAX_MESSAGE_HTML_LENGTH },
    });

    const longText = `<p>${"a".repeat(MAX_MESSAGE_TEXT_LENGTH + 1)}</p>`;
    expect(inspectMessageBody({ bodyHtml: longText })).toMatchObject({
      ok: false,
      error: { code: "too_long", part: "text", max: MAX_MESSAGE_TEXT_LENGTH },
    });
    expect(inspectMessageBody({ body: "a".repeat(MAX_MESSAGE_TEXT_LENGTH + 1) })).toMatchObject({
      ok: false,
      error: { code: "too_long", part: "text", max: MAX_MESSAGE_TEXT_LENGTH },
    });
  });

  it("maps body errors to locale-independent descriptors", () => {
    expect(messageBodyErrorDescriptor({ code: "required" })).toEqual({
      key: "validation.bodyRequired",
    });
    expect(
      messageBodyErrorDescriptor({ code: "too_long", part: "html", max: 50_000 }),
    ).toEqual({ key: "validation.maxLength", params: { max: 50_000 } });
    expect(
      messageBodyErrorDescriptor({ code: "unsupported_merge_fields", fields: ["email"] }),
    ).toEqual({
      key: "validation.unsupportedMergeField",
      params: { fields: "email" },
    });
    expect(
      messageBodyErrorDescriptor({ code: "split_merge_fields", fields: ["firstName"] }),
    ).toEqual({
      key: "validation.mergeFieldFormatting",
      params: { fields: "firstName" },
    });
  });
});
