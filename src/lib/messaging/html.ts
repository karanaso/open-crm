import sanitizeHtml from "sanitize-html";
import { htmlToText } from "html-to-text";
import type { MessageDescriptor } from "@/lib/errors";
import {
  MAX_MESSAGE_HTML_LENGTH,
  MAX_MESSAGE_TEXT_LENGTH,
} from "./limits";
import {
  escapeHtml,
  findSplitMergeFields,
  findUnsupportedMergeFields,
  stripSupportedMergeFields,
  type MergeField,
} from "./render";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "img",
];

const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

function isAllowedLink(href: string): boolean {
  if (!href) return false;
  try {
    return ALLOWED_LINK_PROTOCOLS.includes(new URL(href).protocol);
  } catch {
    return false;
  }
}

function isAllowedImageSource(src: string): boolean {
  if (!src) return false;
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

const SANITIZE_OPTIONS = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["https"] },
  allowProtocolRelative: false,
  nestingLimit: 100,
  parseStyleAttributes: false,
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "form"],
  transformTags: {
    a: (tagName: string, attribs: Record<string, string>) => {
      const href = (attribs.href ?? "").trim();
      const next: Record<string, string> = {};
      if (attribs.title) next.title = attribs.title;
      if (isAllowedLink(href)) next.href = href;
      next.target = "_blank";
      next.rel = "noopener noreferrer";
      return { tagName, attribs: next };
    },
    img: (tagName: string, attribs: Record<string, string>) => {
      const next: Record<string, string> = {};
      const src = (attribs.src ?? "").trim();
      if (src) next.src = src;
      if (attribs.alt !== undefined) next.alt = attribs.alt;
      if (attribs.width) next.width = attribs.width;
      if (attribs.height) next.height = attribs.height;
      return { tagName, attribs: next };
    },
  },
  exclusiveFilter: (frame: { tag: string; attribs: Record<string, string> }) =>
    frame.tag === "img" && !isAllowedImageSource(frame.attribs.src ?? ""),
};

export function sanitizeMessageHtml(input: string): string {
  return sanitizeHtml(input, SANITIZE_OPTIONS).trim();
}

function normalizePlainText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToMessageText(
  html: string,
  options: { includeImages?: boolean } = {},
): string {
  if (!html.trim()) return "";

  const textOptions: Parameters<typeof htmlToText>[1] = {
    wordwrap: false,
    preserveNewlines: true,
    limits: { maxDepth: 100, maxChildNodes: 10_000 },
  };
  if (options.includeImages === false) {
    textOptions.selectors = [{ selector: "img", format: "skip" }];
  }

  return normalizePlainText(htmlToText(html, textOptions));
}

export function plainTextToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").map(escapeHtml);
      return `<p>${lines.join("<br />")}</p>`;
    })
    .join("");
}

export type MessageBodyError =
  | { code: "required" }
  | { code: "too_long"; part: "html" | "text"; max: number }
  | { code: "unsupported_merge_fields"; fields: string[] }
  | { code: "split_merge_fields"; fields: MergeField[] };

export type MessageBodyInspection =
  | { ok: true; body: string; bodyHtml: string | null }
  | { ok: false; error: MessageBodyError };

function uniqueFields(fields: string[]): string[] {
  return [...new Set(fields)];
}

export function inspectMessageBody(input: {
  body?: string | null;
  bodyHtml?: string | null;
}): MessageBodyInspection {
  const rawHtml = input.bodyHtml?.trim();
  if (rawHtml) {
    if (rawHtml.length > MAX_MESSAGE_HTML_LENGTH) {
      return {
        ok: false,
        error: { code: "too_long", part: "html", max: MAX_MESSAGE_HTML_LENGTH },
      };
    }

    const bodyHtml = sanitizeMessageHtml(rawHtml);
    if (bodyHtml.length > MAX_MESSAGE_HTML_LENGTH) {
      return {
        ok: false,
        error: { code: "too_long", part: "html", max: MAX_MESSAGE_HTML_LENGTH },
      };
    }

    const contentText = htmlToMessageText(bodyHtml, { includeImages: false });
    if (!contentText) {
      return { ok: false, error: { code: "required" } };
    }

    const body = htmlToMessageText(bodyHtml);
    if (body.length > MAX_MESSAGE_TEXT_LENGTH) {
      return {
        ok: false,
        error: { code: "too_long", part: "text", max: MAX_MESSAGE_TEXT_LENGTH },
      };
    }

    const split = findSplitMergeFields(bodyHtml, body);
    if (split.length > 0) {
      return { ok: false, error: { code: "split_merge_fields", fields: split } };
    }

    const unsupported = uniqueFields([
      ...findUnsupportedMergeFields(bodyHtml),
      ...findUnsupportedMergeFields(body),
    ]);
    if (unsupported.length > 0) {
      return { ok: false, error: { code: "unsupported_merge_fields", fields: unsupported } };
    }

    if (!stripSupportedMergeFields(contentText).trim()) {
      return { ok: false, error: { code: "required" } };
    }

    return { ok: true, body, bodyHtml };
  }

  const body = input.body?.trim() ?? "";
  if (!body) return { ok: false, error: { code: "required" } };
  if (body.length > MAX_MESSAGE_TEXT_LENGTH) {
    return {
      ok: false,
      error: { code: "too_long", part: "text", max: MAX_MESSAGE_TEXT_LENGTH },
    };
  }

  const unsupported = findUnsupportedMergeFields(body);
  if (unsupported.length > 0) {
    return { ok: false, error: { code: "unsupported_merge_fields", fields: unsupported } };
  }

  if (!stripSupportedMergeFields(body).trim()) {
    return { ok: false, error: { code: "required" } };
  }

  return { ok: true, body, bodyHtml: null };
}

export function messageBodyErrorDescriptor(error: MessageBodyError): MessageDescriptor {
  switch (error.code) {
    case "required":
      return { key: "validation.bodyRequired" };
    case "too_long":
      return { key: "validation.maxLength", params: { max: error.max } };
    case "unsupported_merge_fields":
      return {
        key: "validation.unsupportedMergeField",
        params: { fields: error.fields.join(", ") },
      };
    case "split_merge_fields":
      return {
        key: "validation.mergeFieldFormatting",
        params: { fields: error.fields.join(", ") },
      };
  }
}
