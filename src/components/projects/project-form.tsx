"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImageIcon } from "lucide-react";
import type { BlobRef } from "@atproto/api";
import type { LeafletLinearDocument } from "@/lib/atproto/project-types";
import { ProjectEditor } from "@/components/editor/project-editor";
import Button from "@/components/ui/button";

export interface ProjectFormProps {
  initialData?: {
    title: string;
    shortDescription?: string;
    description?: LeafletLinearDocument;
    bannerUrl?: string | null;
  };
  onSave: (data: {
    title: string;
    shortDescription: string;
    description: LeafletLinearDocument;
    banner?: BlobRef;
  }) => Promise<void>;
  isSaving: boolean;
  mode: "create" | "edit";
  onImageUpload: (file: File) => Promise<{ blobRef: BlobRef; url: string }>;
  saveError?: string | null;
}

const EMPTY_DOCUMENT: LeafletLinearDocument = { blocks: [] };

export function ProjectForm({
  initialData,
  onSave,
  isSaving,
  mode,
  onImageUpload,
  saveError,
}: ProjectFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription ?? ""
  );
  const [description, setDescription] = useState<LeafletLinearDocument>(
    initialData?.description ?? EMPTY_DOCUMENT
  );

  // Banner state
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(
    initialData?.bannerUrl ?? null
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleBannerClick = useCallback(() => {
    bannerInputRef.current?.click();
  }, []);

  const handleBannerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBannerFile(file);
      const objectUrl = URL.createObjectURL(file);
      setBannerPreviewUrl(objectUrl);
    },
    []
  );

  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      setTitleError("Project title is required");
      return;
    }
    setTitleError(null);
    setFormError(null);

    try {
      let bannerBlobRef: BlobRef | undefined;
      if (bannerFile) {
        const { blobRef } = await onImageUpload(bannerFile);
        bannerBlobRef = blobRef;
      }

      await onSave({
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        description,
        banner: bannerBlobRef,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save project. Please try again.";
      setFormError(message);
    }
  }, [title, shortDescription, description, bannerFile, onSave, onImageUpload]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  const shortDescLength = shortDescription.length;
  const shortDescOver = shortDescLength > 300;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Banner upload area */}
      <div
        className="relative w-full cursor-pointer group"
        style={{ aspectRatio: "3 / 1" }}
        onClick={handleBannerClick}
        role="button"
        tabIndex={0}
        aria-label={bannerPreviewUrl ? "Change banner image" : "Add a banner image"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleBannerClick();
        }}
      >
        {bannerPreviewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerPreviewUrl}
              alt="Project banner"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-white font-mono text-sm uppercase tracking-wider">
                <Upload className="w-4 h-4" />
                Change banner
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full border-2 border-dashed border-[var(--color-light-gray)] rounded-lg flex flex-col items-center justify-center gap-3 hover:border-[var(--color-accent)] transition-colors duration-150 bg-[var(--color-off-white)]">
            <ImageIcon className="w-8 h-8 text-[var(--color-mid-gray)]" />
            <span className="font-mono text-sm text-[var(--color-mid-gray)] uppercase tracking-wider">
              Add a banner image
            </span>
          </div>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBannerChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Error display */}
      {(saveError || formError) && (
        <div className="max-w-3xl mx-auto w-full px-4 pt-4">
          <p className="text-body-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-3" role="alert">
            {saveError || formError}
          </p>
        </div>
      )}

      {/* Form content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Title input */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) setTitleError(null);
            }}
            placeholder="Project title"
            className="w-full text-3xl font-mono font-bold bg-transparent border-none outline-none text-[var(--color-navy)] placeholder:text-[var(--color-light-gray)] leading-tight"
            aria-label="Project title"
            aria-required="true"
          />
          {titleError && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{titleError}</p>
          )}
        </div>

        {/* Short description input */}
        <div>
          <input
            type="text"
            value={shortDescription}
            onChange={(e) => {
              if (e.target.value.length <= 300) {
                setShortDescription(e.target.value);
              }
            }}
            placeholder="A brief summary of your project"
            maxLength={300}
            className="w-full text-base bg-transparent border-none border-b border-transparent focus:border-b focus:border-[var(--color-light-gray)] outline-none text-[var(--color-dark-gray)] placeholder:text-[var(--color-mid-gray)] pb-1 transition-colors duration-150"
            aria-label="Short description"
          />
          <div className="flex justify-end mt-1">
            <span
              className={`text-xs font-mono ${
                shortDescOver
                  ? "text-[var(--color-error)]"
                  : "text-[var(--color-mid-gray)]"
              }`}
            >
              {shortDescLength}/300
            </span>
          </div>
        </div>

        {/* Rich text editor */}
        <div className="flex-1">
          <ProjectEditor
            content={description}
            onChange={setDescription}
            onImageUpload={onImageUpload}
            placeholder="Describe your project in detail..."
          />
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 bg-white border-t border-[var(--color-light-gray)] px-4 py-3 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={handleCancel}
            disabled={isSaving}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaving || !title.trim()}
            type="button"
          >
            {mode === "create" ? "Save Project" : "Update Project"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ProjectForm;
