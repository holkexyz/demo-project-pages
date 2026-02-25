"use client";

import { useRef } from "react";
import type { Editor } from "@tiptap/react";
import type { BlobRef } from "@/lib/atproto/project-types";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  Quote,
  Code2,
  Minus,
  Link,
  Image,
  Youtube,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor | null;
  onImageUpload: (file: File) => Promise<{ blobRef: BlobRef; url: string }>;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  title,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        "flex items-center justify-center w-8 h-8 rounded transition-colors",
        "text-[var(--color-dark-gray)] hover:bg-[var(--color-light-gray)]",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        isActive
          ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="w-px h-6 bg-[var(--color-light-gray)] mx-1 self-center" />
  );
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const handleLinkClick = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", previousUrl ?? "https://");
    if (url === null) return; // cancelled
    if (url === "") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.chain().focus().extendMarkRange("link") as any).unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const handleYoutubeClick = () => {
    const url = window.prompt("Enter YouTube URL");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";
    try {
      const { url, blobRef } = await onImageUpload(file);
      editor
        .chain()
        .focus()
        .setImage({
          src: url,
          // @ts-expect-error — custom attr
          cid: blobRef.ref.$link,
        })
        .run();
    } catch (err) {
      console.error("Image upload failed", err);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-[var(--color-light-gray)] bg-[var(--color-off-white)] rounded-t-lg sticky top-0 z-10">
      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic"
      >
        <Italic size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code size={15} />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={15} />
      </ToolbarButton>

      <Divider />

      {/* Block formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Code2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={15} />
      </ToolbarButton>

      <Divider />

      {/* Media & links */}
      <ToolbarButton
        onClick={handleLinkClick}
        isActive={editor.isActive("link")}
        title="Link"
      >
        <Link size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        title="Insert Image"
      >
        <Image size={15} />
      </ToolbarButton>
      <ToolbarButton onClick={handleYoutubeClick} title="Embed YouTube Video">
        <Youtube size={15} />
      </ToolbarButton>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleImageFileChange}
      />
    </div>
  );
}
