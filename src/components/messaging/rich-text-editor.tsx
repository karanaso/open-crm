"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Image as ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

function isAllowedLinkUrl(value: string): boolean {
  try {
    return ALLOWED_LINK_PROTOCOLS.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "secondary" : "ghost"}
      className="size-8"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarSeparator() {
  return <span className="bg-border mx-1 h-6 w-px" aria-hidden="true" />;
}

export function RichTextEditor({
  initialHtml,
  label,
  invalid = false,
}: {
  initialHtml: string;
  label: string;
  invalid?: boolean;
}) {
  const t = useTranslations("messaging");
  const tCommon = useTranslations("common");
  const [html, setHtml] = useState(initialHtml);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
        },
      }),
      Image.configure({ allowBase64: false }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        id: "body",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        "aria-invalid": String(invalid),
      },
    },
    onCreate: ({ editor: current }) => setHtml(current.getHTML()),
    onUpdate: ({ editor: current }) => setHtml(current.getHTML()),
  });

  const toolbar = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      link: current?.isActive("link") ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          id: "body",
          role: "textbox",
          "aria-multiline": "true",
          "aria-label": label,
          "aria-invalid": String(invalid),
        },
      },
    });
  }, [editor, invalid, label]);

  function openLinkDialog() {
    if (!editor) return;
    const href = editor.getAttributes("link").href;
    setLinkUrl(typeof href === "string" ? href : "");
    setLinkError(null);
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const value = linkUrl.trim();
    if (!isAllowedLinkUrl(value)) {
      setLinkError(t("invalidLinkUrl"));
      return;
    }

    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "text",
          text: value,
          marks: [{ type: "link", attrs: { href: value } }],
        })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    }

    setLinkOpen(false);
  }

  function openImageDialog() {
    setImageUrl("");
    setImageAlt("");
    setImageError(null);
    setImageOpen(true);
  }

  function applyImage() {
    if (!editor) return;
    const value = imageUrl.trim();
    if (!isHttpsUrl(value)) {
      setImageError(t("invalidImageUrl"));
      return;
    }

    editor
      .chain()
      .focus()
      .setImage({ src: value, alt: imageAlt.trim() || undefined })
      .run();
    setImageOpen(false);
  }

  return (
    <div
      className={cn(
        "rich-text-editor overflow-hidden rounded-md border border-input bg-background shadow-xs",
        invalid && "border-destructive",
      )}
    >
      <div
        className="bg-muted/30 flex flex-wrap items-center gap-0.5 border-b border-input p-1.5"
        role="toolbar"
        aria-label={t("formatting")}
      >
        <ToolbarButton
          label={t("bold")}
          active={toolbar?.bold}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold />
        </ToolbarButton>
        <ToolbarButton
          label={t("italic")}
          active={toolbar?.italic}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </ToolbarButton>
        <ToolbarButton
          label={t("underline")}
          active={toolbar?.underline}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label={t("bulletedList")}
          active={toolbar?.bulletList}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List />
        </ToolbarButton>
        <ToolbarButton
          label={t("numberedList")}
          active={toolbar?.orderedList}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label={t("link")}
          active={toolbar?.link}
          disabled={!editor}
          onClick={openLinkDialog}
        >
          <Link2 />
        </ToolbarButton>
        <ToolbarButton
          label={t("removeLink")}
          disabled={!editor || !toolbar?.link}
          onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}
        >
          <Link2Off />
        </ToolbarButton>
        <ToolbarButton
          label={t("image")}
          disabled={!editor}
          onClick={openImageDialog}
        >
          <ImageIcon />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton
          label={t("undo")}
          disabled={!editor || !toolbar?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 />
        </ToolbarButton>
        <ToolbarButton
          label={t("redo")}
          disabled={!editor || !toolbar?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
      <input type="hidden" name="bodyHtml" value={html} readOnly />

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("insertLink")}</DialogTitle>
            <DialogDescription>{t("linkUrlHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="message-link-url">{t("linkUrl")}</Label>
            <Input
              id="message-link-url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
              }}
              placeholder="https://example.com"
              autoFocus
            />
            {linkError ? (
              <p role="alert" className="text-xs text-destructive">
                {linkError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={applyLink}>
              {t("insertLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("insertImage")}</DialogTitle>
            <DialogDescription>{t("imageUrlHint")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="message-image-url">{t("imageUrl")}</Label>
              <Input
                id="message-image-url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyImage();
                  }
                }}
                placeholder="https://example.com/image.png"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message-image-alt">{t("imageAlt")}</Label>
              <Input
                id="message-image-alt"
                value={imageAlt}
                onChange={(event) => setImageAlt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyImage();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">{t("imageAltHint")}</p>
            </div>
            {imageError ? (
              <p role="alert" className="text-xs text-destructive">
                {imageError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setImageOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" onClick={applyImage}>
              {t("insertImage")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
