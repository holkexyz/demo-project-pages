"use client";

import { useEffect, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import YoutubeExtension from "@tiptap/extension-youtube";
import LinkExtension from "@tiptap/extension-link";
import PlaceholderExtension from "@tiptap/extension-placeholder";
import type { LeafletLinearDocument, BlobRef } from "@/lib/atproto/project-types";
import { tiptapToLeaflet, leafletToTiptap } from "@/lib/editor/leaflet-serializer";
import { getProjectImageUrl } from "@/lib/atproto/projects";
import { EditorToolbar } from "./editor-toolbar";
import "./editor.css";

interface ProjectEditorProps {
  content: LeafletLinearDocument | undefined;
  onChange: (content: LeafletLinearDocument) => void;
  onImageUpload: (file: File) => Promise<{ blobRef: BlobRef; url: string }>;
  placeholder?: string;
  editable?: boolean;
  pdsUrl?: string;
  did?: string;
}

/**
 * Post-process a TipTap JSONContent document to resolve bare CID strings in
 * image node `src` attributes to real blob URLs.  Only top-level nodes are
 * visited because images cannot be nested inside other block nodes in our
 * schema.
 */
function resolveImageCids(
  doc: JSONContent,
  pdsUrl: string,
  did: string
): JSONContent {
  if (!doc.content) return doc;
  return {
    ...doc,
    content: doc.content.map((node) => {
      if (node.type === "image" && node.attrs?.cid) {
        const src = node.attrs.src as string | undefined;
        // Skip if src is already a real URL
        if (src && (src.startsWith("http") || src.startsWith("blob:"))) {
          return node;
        }
        const cid = node.attrs.cid as string;
        return {
          ...node,
          attrs: {
            ...node.attrs,
            src: getProjectImageUrl(pdsUrl, did, cid),
          },
        };
      }
      return node;
    }),
  };
}

export function ProjectEditor({
  content,
  onChange,
  onImageUpload,
  placeholder = "Start writing your project description...",
  editable = true,
  pdsUrl,
  did,
}: ProjectEditorProps) {
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Use a ref-stable callback for image upload that doesn't depend on editor
  const onImageUploadRef = useCallback(
    async (file: File) => {
      setImageError(null);
      setIsUploading(true);
      try {
        const result = await onImageUpload(file);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Image upload failed";
        setImageError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [onImageUpload]
  );

  const editor = useEditor({
    immediatelyRender: false,
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
    content: content && pdsUrl && did
      ? resolveImageCids(leafletToTiptap(content), pdsUrl, did)
      : content
        ? leafletToTiptap(content)
        : { type: "doc", content: [{ type: "paragraph" }] },
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
            // Use the view directly — no stale closure issue
            onImageUploadRef(file).then(({ url, blobRef }) => {
              const { schema } = view.state;
              const node = schema.nodes.image.create({
                src: url,
                cid: String(blobRef.ref),
              });
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);
            }).catch(() => {
              // Error already handled in onImageUploadRef
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              // Use the view directly — no stale closure issue
              onImageUploadRef(file).then(({ url, blobRef }) => {
                const { schema } = view.state;
                const node = schema.nodes.image.create({
                  src: url,
                  cid: String(blobRef.ref),
                });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }).catch(() => {
                // Error already handled in onImageUploadRef
              });
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
    if (!editor || editor.isDestroyed) return;
    if (!content) return;
    const currentJson = editor.getJSON();
    const newJson = pdsUrl && did
      ? resolveImageCids(leafletToTiptap(content), pdsUrl, did)
      : leafletToTiptap(content);
    // Only update if content actually changed to avoid cursor jumps
    if (JSON.stringify(currentJson) !== JSON.stringify(newJson)) {
      editor.commands.setContent(newJson, false);
    }
  }, [editor, content, pdsUrl, did]);

  return (
    <div className="project-editor border border-[var(--color-light-gray)] rounded-lg overflow-hidden">
      {editable && (
        <EditorToolbar editor={editor} onImageUpload={onImageUpload} isUploading={isUploading} />
      )}
      {imageError && (
        <div className="px-3 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">
          {imageError}
          <button
            type="button"
            onClick={() => setImageError(null)}
            className="ml-2 underline hover:no-underline"
          >
            dismiss
          </button>
        </div>
      )}
      {isUploading && (
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-[var(--color-accent)] bg-blue-50 border-b border-blue-200">
          <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
          Uploading image...
        </div>
      )}
      <div
        className="project-editor__resizable"
        style={{ height: 400, minHeight: 200, maxHeight: "80vh" }}
      >
        <EditorContent editor={editor} className="project-editor__content" />
      </div>
    </div>
  );
}
