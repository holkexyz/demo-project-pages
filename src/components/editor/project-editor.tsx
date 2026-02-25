"use client";

import { useEffect, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import YoutubeExtension from "@tiptap/extension-youtube";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import type { LeafletLinearDocument, BlobRef } from "@/lib/atproto/project-types";
import { tiptapToLeaflet, leafletToTiptap } from "@/lib/editor/leaflet-serializer";
import { EditorToolbar } from "./editor-toolbar";
import "./editor.css";

interface ProjectEditorProps {
  content: LeafletLinearDocument | undefined;
  onChange: (content: LeafletLinearDocument) => void;
  onImageUpload: (file: File) => Promise<{ blobRef: BlobRef; url: string }>;
  placeholder?: string;
  editable?: boolean;
}

export function ProjectEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = "Start writing your project description...",
  editable = true,
}: ProjectEditorProps) {
  const handleImageUploadAndInsert = useCallback(
    async (file: File, editor: ReturnType<typeof useEditor>) => {
      if (!editor) return;
      try {
        const { url, blobRef } = await onImageUpload(file);
        editor
          .chain()
          .focus()
          .setImage({
            src: url,
            // @ts-expect-error — custom attr for serialization
            cid: blobRef.ref.$link,
          })
          .run();
      } catch (err) {
        console.error("Image upload failed", err);
      }
    },
    [onImageUpload]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { languageClassPrefix: "language-" },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          draggable: "true",
        },
      }),
      YoutubeExtension.configure({
        controls: true,
        nocookie: true,
        width: 800,
        height: 480,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      PlaceholderExtension.configure({
        placeholder,
      }),
    ],
    content: content ? leafletToTiptap(content) : { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const leaflet = tiptapToLeaflet(json);
      onChange(leaflet);
    },
    editorProps: {
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            handleImageUploadAndInsert(file, editor);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleImageUploadAndInsert(file, editor);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // Update editable state when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Update content when prop changes (e.g., when loading existing project)
  useEffect(() => {
    if (!editor) return;
    if (!content) return;
    const currentJson = editor.getJSON();
    const newJson = leafletToTiptap(content);
    // Only update if content actually changed to avoid cursor jumps
    if (JSON.stringify(currentJson) !== JSON.stringify(newJson)) {
      editor.commands.setContent(newJson, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return (
    <div className="project-editor border border-[var(--color-light-gray)] rounded-lg overflow-hidden">
      {editable && (
        <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
      )}
      <EditorContent editor={editor} className="project-editor__content" />
    </div>
  );
}
