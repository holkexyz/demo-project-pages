"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { WorkScopeTagRecord } from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";

export interface TagFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    tag: Omit<WorkScopeTagRecord, "$type" | "createdAt">
  ) => Promise<void>;
  existingKeys: string[];
}

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const TagFormModal: React.FC<TagFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingKeys,
}) => {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [kind, setKind] = useState<WorkScopeTagRecord["kind"]>("ecosystem");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate key from label unless manually edited
  useEffect(() => {
    if (!keyManuallyEdited) {
      setKey(labelToKey(label));
    }
  }, [label, keyManuallyEdited]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setLabel("");
      setKey("");
      setKeyManuallyEdited(false);
      setKind("ecosystem");
      setDescription("");
      setParent("");
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!label.trim()) newErrors.label = "Label is required";
    if (!key.trim()) newErrors.key = "Key is required";
    else if (existingKeys.includes(key.trim()))
      newErrors.key = "Key already exists";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        key: key.trim(),
        label: label.trim(),
        kind,
        description: description.trim(),
        parent: parent.trim() || undefined,
        status: "active",
      });
      onClose();
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : "Failed to create tag",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-navy">
            New Tag
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Label */}
          <div>
            <label className="app-card__label block mb-1.5">
              Label <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Mangrove Restoration"
              className={`h-10 w-full border ${errors.label ? "border-red-400" : "border-[rgba(15,37,68,0.15)]"} rounded bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150`}
            />
            {errors.label && (
              <p className="mt-1 text-xs text-red-500">{errors.label}</p>
            )}
          </div>

          {/* Key */}
          <div>
            <label className="app-card__label block mb-1.5">
              Key <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setKeyManuallyEdited(true);
              }}
              placeholder="e.g. mangrove_restoration"
              className={`h-10 w-full border ${errors.key ? "border-red-400" : "border-[rgba(15,37,68,0.15)]"} rounded bg-white px-4 text-sm font-mono text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150`}
            />
            {errors.key && (
              <p className="mt-1 text-xs text-red-500">{errors.key}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Auto-generated from label. Lowercase, underscores only.
            </p>
          </div>

          {/* Kind */}
          <div>
            <label className="app-card__label block mb-1.5">Kind</label>
            <select
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as WorkScopeTagRecord["kind"])
              }
              className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
            >
              {WORK_SCOPE_TAG_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="app-card__label block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this tag represents…"
              rows={3}
              className="w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150 resize-y"
            />
          </div>

          {/* Parent */}
          <div>
            <label className="app-card__label block mb-1.5">
              Parent key (optional)
            </label>
            <input
              type="text"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              placeholder="e.g. ecosystem"
              list="existing-keys"
              className="h-10 w-full border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm font-mono text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
            />
            <datalist id="existing-keys">
              {existingKeys.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>

          {errors.submit && (
            <p className="text-xs text-red-500">{errors.submit}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-mono text-gray-600 border border-gray-200 rounded hover:border-gray-300 transition-colors duration-150 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono text-accent bg-accent/10 border border-accent/20 rounded hover:bg-accent/15 hover:border-accent/35 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Tag
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TagFormModal;
